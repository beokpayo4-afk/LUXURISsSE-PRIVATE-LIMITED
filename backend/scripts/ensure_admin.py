"""Ensure admin user exists and password matches configured ADMIN_PASSWORD."""

from __future__ import annotations

import os
import sys

from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import get_session_factory
from app.models.auth import Role, User, UserRoleLink
from app.models.enums import UserRole, UserStatus


def ensure_admin() -> None:
    settings = get_settings()
    email = (settings.admin_email or settings.company_email or "").strip().lower()
    password = (settings.admin_password or os.getenv("ADMIN_BOOTSTRAP_PASSWORD") or "").strip()

    if not email or not password:
        print("Missing ADMIN_EMAIL/ADMIN_PASSWORD in .env")
        raise SystemExit(1)

    db = get_session_factory()()
    try:
        role = db.scalar(select(Role).where(Role.name == UserRole.ADMIN.value))
        if role is None:
            role = Role(name=UserRole.ADMIN.value, description="Administrator", is_system=True)
            db.add(role)
            db.flush()

        user = db.scalar(select(User).where(User.email == email))
        created = False
        if user is None:
            user = User(
                email=email,
                full_name=settings.company_md or "Admin",
                phone=settings.company_phone,
                hashed_password=hash_password(password),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                is_active=True,
            )
            db.add(user)
            db.flush()
            created = True
        else:
            user.hashed_password = hash_password(password)
            user.role = UserRole.ADMIN
            user.status = UserStatus.ACTIVE
            user.is_active = True
            user.deleted_at = None

        link = db.scalar(
            select(UserRoleLink).where(
                UserRoleLink.user_id == user.id,
                UserRoleLink.role_id == role.id,
            )
        )
        if link is None:
            db.add(UserRoleLink(user_id=user.id, role_id=role.id))

        db.commit()
        print(f"Admin account {'created' if created else 'updated'} successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    ensure_admin()
