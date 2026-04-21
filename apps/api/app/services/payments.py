from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.merchant import AllocationRule, Merchant, Wallet
from app.models.transaction import LedgerEntry, Receipt, Transaction
from app.schemas.payment import CashSaleRequest, MockPaymentRequest
from app.services.audit import write_audit_log
from app.services.fraud import evaluate_fraud
from app.services.offers import recompute_offers
from app.services.trust import recompute_trust_score

TWOPLACES = Decimal("0.01")
EVIDENCE_CONFIDENCE = {
    "verified_qr": Decimal("1.00"),
    "declared_cash": Decimal("0.35"),
}
EVIDENCE_LABELS = {
    "verified_qr": "Verified QR",
    "declared_cash": "Merchant-declared cash",
}
SETTLEMENT_LABELS = {
    "verified_qr": "Verified settlement",
    "declared_cash": "Merchant-declared record",
}


@dataclass(slots=True)
class SaleRequest:
    amount: Decimal
    payer_name: str
    payer_phone: str
    location: str
    device_id: str
    category: str | None
    note: str | None
    recorded_at: datetime


def q(value: Decimal) -> Decimal:
    return value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def evidence_label(source: str) -> str:
    return EVIDENCE_LABELS.get(source, source.replace("_", " ").title())


def settlement_label(source: str) -> str:
    return SETTLEMENT_LABELS.get(source, "Recorded")


def confidence_for_source(source: str) -> Decimal:
    return EVIDENCE_CONFIDENCE[source]


def sale_request_from_mock(payload: MockPaymentRequest) -> SaleRequest:
    return SaleRequest(
        amount=payload.amount,
        payer_name=payload.payer_name,
        payer_phone=payload.payer_phone,
        location=payload.location,
        device_id=payload.device_id,
        category="qr_payment",
        note=None,
        recorded_at=datetime.now(UTC),
    )


def sale_request_from_cash(payload: CashSaleRequest) -> SaleRequest:
    return SaleRequest(
        amount=payload.amount,
        payer_name=(payload.payer_name or "Cash customer").strip(),
        payer_phone=(payload.payer_phone or "Not provided").strip(),
        location=payload.location,
        device_id=payload.device_id,
        category=payload.category,
        note=payload.note,
        recorded_at=payload.recorded_at or datetime.now(UTC),
    )


def allocation_preview(amount: Decimal, rules: AllocationRule) -> dict[str, Decimal]:
    amount = q(amount)
    save_amount = q(amount * Decimal(str(rules.save_percent)) / Decimal("100"))
    growth_amount = q(amount * Decimal(str(rules.growth_percent)) / Decimal("100"))
    operating_amount = q(amount - save_amount - growth_amount)
    if rules.round_up_enabled:
        rounded_total = amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        save_amount = q(save_amount + max(Decimal("0.00"), rounded_total - amount))
        operating_amount = q(amount - save_amount - growth_amount)
    return {
        "operating": operating_amount,
        "savings": save_amount,
        "growth": growth_amount,
    }


def process_sale(
    db: Session,
    merchant: Merchant,
    sale: SaleRequest,
    *,
    evidence_source: str,
    channel: str,
    external_prefix: str,
) -> dict:
    wallet = db.scalar(select(Wallet).where(Wallet.merchant_id == merchant.id))
    rules = db.scalar(select(AllocationRule).where(AllocationRule.merchant_id == merchant.id))
    confidence = confidence_for_source(evidence_source)
    amount = q(sale.amount)
    allocation = allocation_preview(amount, rules)

    transaction = Transaction(
        merchant_id=merchant.id,
        amount=amount,
        currency="USD",
        status="success",
        evidence_source=evidence_source,
        evidence_confidence=confidence,
        reference=f"ZBV-{uuid4().hex[:10].upper()}",
        external_reference=f"{external_prefix}-{uuid4().hex[:8].upper()}",
        channel=channel,
        payer_name=sale.payer_name,
        payer_phone=sale.payer_phone,
        category=sale.category,
        note=sale.note,
        device_id=sale.device_id,
        location=sale.location,
        recorded_at=sale.recorded_at,
    )
    db.add(transaction)
    db.flush()

    wallet.operating_balance = q(Decimal(str(wallet.operating_balance)) + allocation["operating"])
    wallet.savings_balance = q(Decimal(str(wallet.savings_balance)) + allocation["savings"])
    wallet.growth_balance = q(Decimal(str(wallet.growth_balance)) + allocation["growth"])

    entries = [
        LedgerEntry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            pocket="operating",
            entry_type="credit",
            amount=allocation["operating"],
            balance_after=wallet.operating_balance,
            narrative=f"Operating allocation from {transaction.reference}",
        ),
        LedgerEntry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            pocket="savings",
            entry_type="credit",
            amount=allocation["savings"],
            balance_after=wallet.savings_balance,
            narrative=f"Savings allocation from {transaction.reference}",
        ),
        LedgerEntry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            pocket="growth",
            entry_type="credit",
            amount=allocation["growth"],
            balance_after=wallet.growth_balance,
            narrative=f"Growth allocation from {transaction.reference}",
        ),
    ]
    db.add_all(entries)

    receipt = Receipt(
        transaction_id=transaction.id,
        merchant_id=merchant.id,
        receipt_number=f"RCPT-{datetime.now(UTC).strftime('%Y%m%d')}-{transaction.id:05d}",
        payload_json={
            "merchant_name": merchant.business_name,
            "amount": str(amount),
            "currency": "USD",
            "payer_name": sale.payer_name,
            "payer_phone": sale.payer_phone,
            "reference": transaction.reference,
            "evidence_type": evidence_label(evidence_source),
            "evidence_source": evidence_source,
            "evidence_confidence": str(confidence),
            "settlement_status": settlement_label(evidence_source),
            "category": sale.category,
            "note": sale.note,
            "location": sale.location,
            "allocation": {key: str(value) for key, value in allocation.items()},
            "timestamp": sale.recorded_at.isoformat(),
        },
    )
    db.add(receipt)

    fraud_alerts = evaluate_fraud(db, merchant, transaction)
    trust = recompute_trust_score(db, merchant)
    offers = recompute_offers(db, merchant)

    write_audit_log(
        db,
        action="payment_processed" if evidence_source == "verified_qr" else "cash_sale_recorded",
        entity_type="transaction",
        entity_id=str(transaction.id),
        merchant_id=merchant.id,
        metadata={
            "reference": transaction.reference,
            "amount": str(amount),
            "evidence_source": evidence_source,
            "evidence_confidence": str(confidence),
        },
    )
    return {
        "transaction": transaction,
        "receipt": receipt,
        "allocation": allocation,
        "trust_score": trust,
        "offers": offers,
        "fraud_alerts": fraud_alerts,
    }


def process_mock_payment(db: Session, merchant: Merchant, payload: MockPaymentRequest) -> dict:
    return process_sale(
        db,
        merchant,
        sale_request_from_mock(payload),
        evidence_source="verified_qr",
        channel="mock_qr",
        external_prefix="MOCK",
    )


def process_cash_sale(db: Session, merchant: Merchant, payload: CashSaleRequest) -> dict:
    return process_sale(
        db,
        merchant,
        sale_request_from_cash(payload),
        evidence_source="declared_cash",
        channel="declared_cash",
        external_prefix="CASH",
    )
