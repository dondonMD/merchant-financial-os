from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.fraud_alert import FraudAlert
from app.models.merchant import Merchant, TrustScore, Wallet
from app.models.transaction import Transaction

LEGACY_BREAKDOWN_KEYS = {
    "transaction_frequency": "payment_frequency",
    "revenue_consistency": "average_ticket_strength",
    "repeat_behaviour": "repeat_activity",
    "savings_discipline": "savings_discipline",
    "dispute_ratio": "risk_signal_score",
    "account_longevity": "account_maturity",
    "device_location_stability": "device_continuity",
}


def tier_for(score: int) -> str:
    if score >= 85:
        return "Bankable"
    if score >= 70:
        return "Trusted"
    if score >= 50:
        return "Growing"
    return "Starter"


def normalize_breakdown_keys(payload: dict | None) -> dict:
    if not payload:
        return {}
    return {LEGACY_BREAKDOWN_KEYS.get(key, key): value for key, value in payload.items()}


def calculate_trust_metrics(
    transactions: list[Transaction],
    *,
    savings_balance: Decimal,
    fraud_count: int,
    has_known_device: bool,
) -> tuple[int, str, dict[str, int], dict[str, float | int | bool]]:
    weighted_count = sum(Decimal(str(tx.evidence_confidence)) for tx in transactions)
    weighted_total = sum((Decimal(str(tx.amount)) * Decimal(str(tx.evidence_confidence)) for tx in transactions), Decimal("0.00"))
    total_value = sum((Decimal(str(tx.amount)) for tx in transactions), Decimal("0.00"))
    verified_count = len([tx for tx in transactions if tx.evidence_source == "verified_qr"])
    declared_count = len([tx for tx in transactions if tx.evidence_source == "declared_cash"])
    avg_value = weighted_total / weighted_count if weighted_count else Decimal("0.00")
    savings_ratio = (Decimal(str(savings_balance)) / weighted_total) if weighted_total else Decimal("0.00")

    payment_frequency = min(20, int(weighted_count * Decimal("2")))
    average_ticket_strength = min(20, int(avg_value))
    repeat_activity = min(12, int(weighted_count * Decimal("2.4")))
    savings_discipline = min(18, int(savings_ratio * Decimal("100")))
    risk_signal_score = max(0, 15 - fraud_count * 4)
    account_maturity = min(10, 3 + int(weighted_count // Decimal("3")))
    device_continuity = 5 if has_known_device else 2

    breakdown = {
        "payment_frequency": payment_frequency,
        "average_ticket_strength": average_ticket_strength,
        "repeat_activity": repeat_activity,
        "savings_discipline": savings_discipline,
        "risk_signal_score": risk_signal_score,
        "account_maturity": account_maturity,
        "device_continuity": device_continuity,
    }
    score = max(0, min(100, sum(breakdown.values())))
    raw_inputs = {
        "verified_transaction_count": verified_count,
        "declared_cash_count": declared_count,
        "weighted_activity_count": float(weighted_count.quantize(Decimal("0.01"))),
        "average_payment_value": float(avg_value.quantize(Decimal("0.01"))) if weighted_count else 0.0,
        "savings_ratio": float((savings_ratio * Decimal("100")).quantize(Decimal("0.01"))) if weighted_total else 0.0,
        "active_fraud_count": fraud_count,
        "known_device_present": has_known_device,
        "verified_activity_value": float(sum((Decimal(str(tx.amount)) for tx in transactions if tx.evidence_source == "verified_qr"), Decimal("0.00"))),
        "declared_activity_value": float(sum((Decimal(str(tx.amount)) for tx in transactions if tx.evidence_source == "declared_cash"), Decimal("0.00"))),
        "total_activity_value": float(total_value),
    }
    return score, tier_for(score), breakdown, raw_inputs


def recompute_trust_score(db: Session, merchant: Merchant) -> TrustScore:
    txs = db.scalars(select(Transaction).where(Transaction.merchant_id == merchant.id, Transaction.status == "success")).all()
    wallet = db.scalar(select(Wallet).where(Wallet.merchant_id == merchant.id))
    fraud_count = db.scalar(select(func.count(FraudAlert.id)).where(FraudAlert.merchant_id == merchant.id, FraudAlert.status == "open")) or 0
    score, tier, breakdown, raw_inputs = calculate_trust_metrics(
        txs,
        savings_balance=Decimal(str(wallet.savings_balance if wallet else 0)),
        fraud_count=int(fraud_count),
        has_known_device=bool(merchant.device_hash),
    )
    trust = db.scalar(select(TrustScore).where(TrustScore.merchant_id == merchant.id))
    if not trust:
        trust = TrustScore(merchant_id=merchant.id, score=score, tier=tier, breakdown_json=breakdown, inputs_json=raw_inputs)
        db.add(trust)
    else:
        trust.score = score
        trust.tier = tier
        trust.breakdown_json = breakdown
        trust.inputs_json = raw_inputs
    return trust
