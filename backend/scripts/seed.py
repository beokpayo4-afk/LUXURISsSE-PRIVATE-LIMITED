"""Seed verified company settings and system roles."""

import os

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import get_session_factory
from app.models.auth import Role, User, UserRoleLink
from app.models.enums import UserRole
from app.models.system import CompanySetting, WebsiteSetting

SYSTEM_ROLES = [
    (UserRole.SUPER_ADMIN.value, "Full platform control"),
    (UserRole.ADMIN.value, "Administrator"),
    (UserRole.MANAGER.value, "Operations manager"),
    (UserRole.STAFF.value, "Staff operator"),
    (UserRole.CUSTOMER.value, "Customer portal access"),
]


def _ensure_role(db, name: str, description: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == name))
    if role:
        return role
    role = Role(name=name, description=description, is_system=True)
    db.add(role)
    db.flush()
    return role


def seed() -> None:
    settings = get_settings()
    db = get_session_factory()()
    try:
        for name, desc in SYSTEM_ROLES:
            _ensure_role(db, name, desc)

        pairs = [
            ("company_email", settings.company_email, "Company email"),
            ("company_phone", settings.company_phone, "Company phone"),
            ("company_address", settings.company_address, "Company address"),
            ("company_md", settings.company_md, "Managing Director"),
            ("company_director", settings.company_director, "Director"),
        ]
        for key, value, label in pairs:
            for model in (WebsiteSetting, CompanySetting):
                existing = db.scalar(select(model).where(model.key == key))
                if existing:
                    existing.value = value
                    existing.label = label
                else:
                    db.add(model(key=key, value=value, label=label))

        admin_email = (settings.admin_email or settings.company_email or "").lower().strip()
        admin_password = (settings.admin_password or os.getenv("ADMIN_BOOTSTRAP_PASSWORD") or "").strip()
        if admin_email:
            user = db.scalar(select(User).where(User.email == admin_email))
            if user is None:
                if not admin_password:
                    print("Skipping admin user seed: set ADMIN_PASSWORD in .env")
                else:
                    admin_role = _ensure_role(db, UserRole.ADMIN.value, "Administrator")
                    user = User(
                        email=admin_email,
                        full_name=settings.company_md,
                        phone=settings.company_phone,
                        hashed_password=hash_password(admin_password),
                        role=UserRole.ADMIN,
                    )
                    db.add(user)
                    db.flush()
                    db.add(UserRoleLink(user_id=user.id, role_id=admin_role.id))
            elif admin_password:
                # Keep local admin password in sync with .env during development seeds
                user.hashed_password = hash_password(admin_password)
                user.role = UserRole.ADMIN
                user.is_active = True
                if hasattr(user, "status"):
                    from app.models.enums import UserStatus

                    user.status = UserStatus.ACTIVE
                user.deleted_at = None


        db.commit()
        print("Seed complete (verified company settings + roles).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
