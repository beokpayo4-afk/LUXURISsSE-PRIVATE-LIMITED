"""Pydantic schemas for simplified tickets."""

from __future__ import annotations

from datetime import date, time
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

TicketType = Literal["Local Bus", "Tempo", "E-Rickshaw", "Other"]
TicketStatus = Literal["Active", "Inactive"]

ALLOWED_TYPES = {"Local Bus", "Tempo", "E-Rickshaw", "Other"}
ALLOWED_STATUSES = {"Active", "Inactive"}


class TicketWrite(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: TicketType
    state: str = Field(min_length=1, max_length=120)
    from_location: str = Field(min_length=1, max_length=200)
    to_location: str = Field(min_length=1, max_length=200)
    pickup: Optional[str] = Field(default=None, max_length=200)
    drop: Optional[str] = Field(default=None, max_length=200)
    date: date
    time: time
    price: Decimal = Field(gt=0)
    status: TicketStatus = "Active"

    @field_validator("name", "state", "from_location", "to_location")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field is required")
        return cleaned

    @field_validator("pickup", "drop")
    @classmethod
    def strip_optional(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("type")
    @classmethod
    def validate_type(cls, value: str) -> str:
        if value not in ALLOWED_TYPES:
            raise ValueError(f"type must be one of: {', '.join(sorted(ALLOWED_TYPES))}")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in ALLOWED_STATUSES:
            raise ValueError("status must be Active or Inactive")
        return value


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    state: str
    from_location: str
    to_location: str
    pickup: Optional[str] = None
    drop: Optional[str] = None
    date: date
    time: time
    price: Decimal
    status: str
