"""Generic list/create helpers used by foundation routers."""

from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


def list_all(db: Session, model: type[ModelT], *, limit: int = 100) -> list[ModelT]:
    return list(db.scalars(select(model).limit(limit)).all())


def get_by_id(db: Session, model: type[ModelT], item_id: int) -> ModelT | None:
    return db.get(model, item_id)


def create_row(db: Session, model: type[ModelT], data: dict[str, Any]) -> ModelT:
    row = model(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_row(db: Session, row: ModelT, data: dict[str, Any]) -> ModelT:
    for key, value in data.items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_row(db: Session, row: ModelT) -> None:
    db.delete(row)
    db.commit()
