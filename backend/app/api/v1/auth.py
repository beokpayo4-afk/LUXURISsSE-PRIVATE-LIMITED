"""Authentication and authorization endpoints."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.core.deps import AdminUser, CurrentUser, CustomerUser
from app.db.session import get_db
from app.schemas.user import (
    ChangePasswordRequest,
    CustomerRegister,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LogoutRequest,
    MessageResponse,
    ResetPasswordRequest,
    Token,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UserLogin,
    UserRead,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_meta(request: Request, user_agent: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    ip = request.client.host if request.client else None
    return user_agent, ip


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_customer(
    payload: CustomerRegister,
    db: Annotated[Session, Depends(get_db)],
) -> UserRead:
    """Public customer registration only."""
    user = auth_service.register_customer(db, payload)
    return UserRead.model_validate(user)


@router.post("/login", response_model=Token)
def login(
    payload: UserLogin,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user_agent: Annotated[Optional[str], Header(alias="User-Agent")] = None,
) -> Token:
    ua, ip = _client_meta(request, user_agent)
    return auth_service.authenticate(db, payload.email, payload.password, user_agent=ua, ip=ip)


@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh(
    payload: TokenRefreshRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenRefreshResponse:
    return auth_service.refresh_tokens(db, payload.refresh_token)


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: LogoutRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    """Revoke refresh token(s). Client must discard the access token."""
    return auth_service.logout(db, user=user, refresh_token=payload.refresh_token)


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    return auth_service.change_password(db, user, payload)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> ForgotPasswordResponse:
    """Always returns a generic message. Email send is stubbed in this phase."""
    return auth_service.forgot_password(db, payload.email)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    return auth_service.reset_password(db, payload)


@router.get("/customer/ping", response_model=MessageResponse)
def customer_ping(_user: CustomerUser) -> MessageResponse:
    """Customer-only smoke route for authorization tests."""
    return MessageResponse(message="customer ok")


@router.get("/admin/ping", response_model=MessageResponse)
def admin_ping(_user: AdminUser) -> MessageResponse:
    """Admin-only smoke route for authorization tests."""
    return MessageResponse(message="admin ok")
