from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    status: Mapped[str] = mapped_column(String(24), default="success")
    evidence_source: Mapped[str] = mapped_column(String(24), default="verified_qr")
    evidence_confidence: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("1.00"))
    reference: Mapped[str] = mapped_column(String(40), unique=True)
    external_reference: Mapped[str] = mapped_column(String(40))
    channel: Mapped[str] = mapped_column(String(24), default="mock_qr")
    payer_name: Mapped[str] = mapped_column(String(120))
    payer_phone: Mapped[str] = mapped_column(String(32))
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    note: Mapped[str | None] = mapped_column(String(240), nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    failure_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"), unique=True)
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"))
    receipt_number: Mapped[str] = mapped_column(String(40), unique=True)
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    wallet_id: Mapped[int] = mapped_column(ForeignKey("wallets.id"))
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"))
    pocket: Mapped[str] = mapped_column(String(24))
    entry_type: Mapped[str] = mapped_column(String(24))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    balance_after: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    narrative: Mapped[str] = mapped_column(String(240))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
