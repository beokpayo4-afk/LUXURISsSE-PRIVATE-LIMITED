"""Authentication domain service."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_raw_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.auth import PasswordResetToken, RefreshToken, Role, User, UserRoleLink
from app.models.customers import Customer
from app.models.enums import TokenType, UserRole, UserStatus
from app.schemas.user import (
    ChangePasswordRequest,
    CustomerRegister,
    ForgotPasswordResponse,
    MessageResponse,
    ResetPasswordRequest,
    Token,
    TokenRefreshResponse,
    UserRead,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    """Normalize DB datetimes (SQLite may return naive values)."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _ensure_role(db: Session, name: str, description: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == name))
    if role:
        return role
    role = Role(name=name, description=description, is_system=True)
    db.add(role)
    db.flush()
    return role


def _link_role(db: Session, user: User, role_name: str) -> None:
    descriptions = {
        UserRole.SUPER_ADMIN.value: "Full platform control",
        UserRole.ADMIN.value: "Administrator",
        UserRole.MANAGER.value: "Operations manager",
        UserRole.STAFF.value: "Staff operator",
        UserRole.CUSTOMER.value: "Customer portal access",
    }
    role = _ensure_role(db, role_name, descriptions.get(role_name, role_name))
    exists = db.scalar(
        select(UserRoleLink).where(
            UserRoleLink.user_id == user.id,
            UserRoleLink.role_id == role.id,
        )
    )
    if not exists:
        db.add(UserRoleLink(user_id=user.id, role_id=role.id))


def _issue_token_pair(db: Session, user: User, *, user_agent: str | None = None, ip: str | None = None) -> Token:
    settings = get_settings()
    jti = generate_raw_token(16)
    access = create_access_token(str(user.id), role=user.role.value)
    refresh, expires_at = create_refresh_token(str(user.id), role=user.role.value, jti=jti)
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=jti,
            token_hash=hash_token(refresh),
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip,
        )
    )
    db.commit()
    return Token(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserRead.model_validate(user),
    )


def register_customer(db: Session, payload: CustomerRegister) -> User:
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=UserRole.CUSTOMER,
        status=UserStatus.ACTIVE,
        is_active=True,
    )
    db.add(user)
    db.flush()
    _link_role(db, user, UserRole.CUSTOMER.value)
    db.add(
        Customer(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
        )
    )
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str, *, user_agent: str | None = None, ip: str | None = None) -> Token:
    user = db.scalar(
        select(User).where(
            User.email == email.lower().strip(),
            User.deleted_at.is_(None),
        )
    )
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Inactive user")
    return _issue_token_pair(db, user, user_agent=user_agent, ip=ip)


def refresh_tokens(db: Session, refresh_token: str) -> TokenRefreshResponse:
    settings = get_settings()
    try:
        payload = decode_token(refresh_token, expected_type=TokenType.REFRESH)
        jti = payload["jti"]
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid refresh token") from None

    stored = db.scalar(select(RefreshToken).where(RefreshToken.jti == jti))
    now = _utcnow()
    if (
        stored is None
        or stored.revoked_at is not None
        or _as_utc(stored.expires_at) <= now
        or stored.token_hash != hash_token(refresh_token)
        or stored.user_id != user_id
    ):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.get(User, user_id)
    if not user or not user.is_active or user.deleted_at is not None:
        raise HTTPException(status_code=401, detail="User inactive or not found")

    stored.revoked_at = now
    pair = _issue_token_pair(db, user)
    return TokenRefreshResponse(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


def logout(db: Session, *, user: User, refresh_token: str | None) -> MessageResponse:
    now = _utcnow()
    if refresh_token:
        try:
            payload = decode_token(refresh_token, expected_type=TokenType.REFRESH)
            jti = payload.get("jti")
        except ValueError:
            jti = None
        if jti:
            stored = db.scalar(
                select(RefreshToken).where(
                    RefreshToken.jti == jti,
                    RefreshToken.user_id == user.id,
                )
            )
            if stored and stored.revoked_at is None:
                stored.revoked_at = now
    else:
        tokens = db.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == user.id,
                RefreshToken.revoked_at.is_(None),
            )
        ).all()
        for token in tokens:
            token.revoked_at = now
    db.commit()
    return MessageResponse(message="Logged out")


def change_password(db: Session, user: User, payload: ChangePasswordRequest) -> MessageResponse:
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")
    user.hashed_password = hash_password(payload.new_password)
    # Revoke all refresh sessions after password change
    now = _utcnow()
    for token in db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        )
    ).all():
        token.revoked_at = now
    db.commit()
    return MessageResponse(message="Password updated")


def forgot_password(db: Session, email: str) -> ForgotPasswordResponse:
    settings = get_settings()
    generic = "If an account exists for that email, password reset instructions have been sent."
    user = db.scalar(
        select(User).where(
            User.email == email.lower().strip(),
            User.deleted_at.is_(None),
        )
    )
    if not user:
        return ForgotPasswordResponse(message=generic)

    raw = generate_raw_token(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=_utcnow()
            + timedelta(minutes=settings.password_reset_expire_minutes),
        )
    )
    db.commit()
    # Email delivery is intentionally stubbed; never log the raw token in production.
    include_token = settings.app_env in {"test", "development"}
    return ForgotPasswordResponse(
        message=generic,
        reset_token=raw if include_token else None,
    )


def reset_password(db: Session, payload: ResetPasswordRequest) -> MessageResponse:
    token_hash = hash_token(payload.token)
    row = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    now = _utcnow()
    if row is None or row.used_at is not None or _as_utc(row.expires_at) <= now:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.get(User, row.user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.hashed_password = hash_password(payload.new_password)
    row.used_at = now
    for token in db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        )
    ).all():
        token.revoked_at = now
    db.commit()
    return MessageResponse(message="Password has been reset")
