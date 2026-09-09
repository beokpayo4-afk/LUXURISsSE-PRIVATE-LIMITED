"""Tickets CRUD API — simplified transport tickets."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import StaffUser
from app.crud import base as crud
from app.db.session import get_db
from app.models.tickets import Ticket
from app.schemas.tickets import TicketRead, TicketWrite

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=list[TicketRead])
def list_tickets(
    db: Annotated[Session, Depends(get_db)],
    active_only: bool = Query(False),
    status_filter: Optional[str] = Query(None, alias="status"),
    state: Optional[str] = Query(None),
) -> list[Ticket]:
    stmt = select(Ticket).order_by(Ticket.state.asc(), Ticket.date.asc(), Ticket.time.asc(), Ticket.id.desc())
    if active_only:
        stmt = stmt.where(Ticket.status == "Active")
    elif status_filter:
        stmt = stmt.where(Ticket.status == status_filter)
    if state:
        stmt = stmt.where(Ticket.state == state)
    return list(db.scalars(stmt).all())


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(ticket_id: int, db: Annotated[Session, Depends(get_db)]) -> Ticket:
    row = crud.get_by_id(db, Ticket, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return row


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketWrite,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Ticket:
    return crud.create_row(db, Ticket, payload.model_dump())


@router.put("/{ticket_id}", response_model=TicketRead)
def update_ticket(
    ticket_id: int,
    payload: TicketWrite,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Ticket:
    row = crud.get_by_id(db, Ticket, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.update_row(db, row, payload.model_dump())


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_ticket(
    ticket_id: int,
    _: StaffUser,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    row = crud.get_by_id(db, Ticket, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    crud.delete_row(db, row)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
