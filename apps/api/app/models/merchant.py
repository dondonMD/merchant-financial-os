from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(32), unique=True)
    business_name: Mapped[str] = mapped_column(String(160))
    business_type: Mapped[str] = mapped_column(String(80))
    national_id: Mapped[str] = mapped_column(String(32), unique=True)
    location: Mapped[str] = mapped_column(String(120))
    language_preference: Mapped[str] = mapped_column(String(8), default="en")
    device_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    wallet: Mapped["Wallet"] = relationship(back_populates="merchant", uselist=False)
    allocation_rule: Mapped["AllocationRule"] = relationship(back_populates="merchant", uselist=False)
    trust_score: Mapped["TrustScore"] = relationship(back_populates="merchant", uselist=False)


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(primary_key=True)
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"), unique=True)
    operating_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    savings_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    growth_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    merchant: Mapped[Merchant] = relationship(back_populates="wallet")


class AllocationRule(Base):
    __tablename__ = "allocation_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"), unique=True)
    save_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("5.00"))
    growth_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("2.00"))
    round_up_enabled: Mapped[bool] = mapped_column(default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    merchant: Mapped[Merchant] = relationship(back_populates="allocation_rule")


class TrustScore(Base):
    __tablename__ = "trust_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"), unique=True)
    score: Mapped[int] = mapped_column(default=35)
    tier: Mapped[str] = mapped_column(String(24), default="Starter")
    breakdown_json: Mapped[dict] = mapped_column(JSON, default=dict)
    inputs_json: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    merchant: Mapped[Merchant] = relationship(back_populates="trust_score")
