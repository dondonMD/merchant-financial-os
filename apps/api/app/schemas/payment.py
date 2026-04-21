from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class MockPaymentRequest(BaseModel):
    merchant_id: int
    payer_name: str = Field(min_length=2, max_length=120)
    payer_phone: str = Field(min_length=9, max_length=32)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    location: str = Field(min_length=2, max_length=120)
    device_id: str = Field(min_length=4, max_length=120)
    idempotency_key: str = Field(min_length=8, max_length=120)


class CashSaleRequest(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payer_name: str | None = Field(default=None, min_length=2, max_length=120)
    payer_phone: str | None = Field(default=None, min_length=9, max_length=32)
    category: str = Field(min_length=2, max_length=80)
    note: str | None = Field(default=None, max_length=240)
    location: str = Field(min_length=2, max_length=120)
    device_id: str = Field(min_length=4, max_length=120)
    recorded_at: datetime | None = None
