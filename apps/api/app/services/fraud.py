from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fraud_alert import FraudAlert
from app.models.merchant import Merchant
from app.models.transaction import Transaction


def evaluate_fraud(db: Session, merchant: Merchant, transaction: Transaction) -> list[FraudAlert]:
    alerts: list[FraudAlert] = []
    if Decimal(str(transaction.amount)) >= Decimal("250.00"):
        alerts.append(
            FraudAlert(
                merchant_id=merchant.id,
                transaction_id=transaction.id,
                severity="high",
                rule_code="HIGH_AMOUNT",
                message="Transaction value is unusually high for informal retail activity.",
            )
        )
    if merchant.device_hash and transaction.device_id and merchant.device_hash != transaction.device_id:
        if Decimal(str(transaction.amount)) >= Decimal("100.00"):
            alerts.append(
                FraudAlert(
                    merchant_id=merchant.id,
                    transaction_id=transaction.id,
                    severity="medium",
                    rule_code="NEW_DEVICE_HIGH_VALUE",
                    message="High-value payment attempted from a new device signature.",
                )
            )

    recent_cutoff = datetime.now(UTC) - timedelta(minutes=3)
    recent = db.scalars(
        select(Transaction).where(
            Transaction.merchant_id == merchant.id,
            Transaction.created_at >= recent_cutoff,
            Transaction.status == "success",
        )
    ).all()
    if len(recent) >= 4:
        alerts.append(
            FraudAlert(
                merchant_id=merchant.id,
                transaction_id=transaction.id,
                severity="medium",
                rule_code="RAPID_REPEAT_TX",
                message="Rapid repeated successful payments detected in a short window.",
            )
        )
    for alert in alerts:
        db.add(alert)
    return alerts

