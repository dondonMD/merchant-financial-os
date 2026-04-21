from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import fingerprint, hash_password
from app.models.fraud_alert import FraudAlert
from app.models.merchant import AllocationRule, Merchant, TrustScore, Wallet
from app.models.offer import Offer
from app.models.transaction import LedgerEntry, Receipt, Transaction
from app.models.user import User
from app.services.trust import recompute_trust_score, tier_for


def seed_database(db: Session) -> None:
    if db.scalar(select(User).where(User.email == settings.seed_admin_email)):
        for merchant in db.scalars(select(Merchant)).all():
            recompute_trust_score(db, merchant)
        db.commit()
        return

    merchants = [
        Merchant(
            full_name="Tariro Moyo",
            phone="+263771100101",
            business_name="Mbare Fresh Produce",
            business_type="Market Produce",
            national_id="63-182344A63",
            location="Harare",
            language_preference="en",
            device_hash=fingerprint("device-tariro"),
        ),
        Merchant(
            full_name="Sibusiso Ncube",
            phone="+263771100202",
            business_name="Bulawayo Fast Repairs",
            business_type="Phone Repairs",
            national_id="08-928344Z08",
            location="Bulawayo",
            language_preference="nd",
            device_hash=fingerprint("device-sbu"),
        ),
        Merchant(
            full_name="Rudo Chari",
            phone="+263771100303",
            business_name="Masvingo Home Bakes",
            business_type="Food Vendor",
            national_id="12-998344R12",
            location="Masvingo",
            language_preference="sn",
            device_hash=fingerprint("device-rudo"),
        ),
    ]
    db.add_all(merchants)
    db.flush()

    admin = User(email=settings.seed_admin_email, password_hash=hash_password(settings.seed_admin_password), role="admin")
    db.add(admin)

    merchant_users = [
        User(email="tariro@zbvaka.co.zw", password_hash=hash_password("Merchant123!"), role="merchant", merchant_id=merchants[0].id),
        User(email="sibusiso@zbvaka.co.zw", password_hash=hash_password("Merchant123!"), role="merchant", merchant_id=merchants[1].id),
        User(email="rudo@zbvaka.co.zw", password_hash=hash_password("Merchant123!"), role="merchant", merchant_id=merchants[2].id),
    ]
    db.add_all(merchant_users)

    for index, merchant in enumerate(merchants):
        wallet = Wallet(
            merchant_id=merchant.id,
            operating_balance=Decimal(str(200 + index * 75)),
            savings_balance=Decimal(str(35 + index * 18)),
            growth_balance=Decimal(str(18 + index * 12)),
        )
        db.add(wallet)
        db.add(
            AllocationRule(
                merchant_id=merchant.id,
                save_percent=Decimal("6.00") if index == 0 else Decimal("5.00"),
                growth_percent=Decimal("3.00") if index == 1 else Decimal("2.00"),
                round_up_enabled=index != 2,
            )
        )
        score = 48 + index * 18
        db.add(
            TrustScore(
                merchant_id=merchant.id,
                score=score,
                tier=tier_for(score),
                breakdown_json={
                    "payment_frequency": 12 + index * 2,
                    "average_ticket_strength": 10 + index * 3,
                    "repeat_activity": 8 + index * 2,
                    "savings_discipline": 7 + index * 3,
                    "risk_signal_score": 12 - index,
                    "account_maturity": 4 + index * 2,
                    "device_continuity": 5,
                },
                inputs_json={
                    "verified_transaction_count": 1,
                    "declared_cash_count": 0,
                    "weighted_activity_count": 1.0,
                    "average_payment_value": float(28 + index * 12),
                    "savings_ratio": float((Decimal(str(35 + index * 18)) / Decimal(str(28 + index * 12)) * Decimal("100")).quantize(Decimal("0.01"))),
                    "active_fraud_count": 0,
                    "known_device_present": True,
                    "verified_activity_value": float(28 + index * 12),
                    "declared_activity_value": 0.0,
                    "total_activity_value": float(28 + index * 12),
                },
            )
        )
        tx = Transaction(
            merchant_id=merchant.id,
            amount=Decimal(str(28 + index * 12)),
            currency="USD",
            status="success",
            evidence_source="verified_qr",
            evidence_confidence=Decimal("1.00"),
            reference=f"ZBV-SEED-{merchant.id:03d}",
            external_reference=f"MOCK-SEED-{merchant.id:03d}",
            channel="mock_qr",
            payer_name="Demo Customer",
            payer_phone="+263778000000",
            category="qr_payment",
            device_id=merchant.device_hash,
            location=merchant.location,
        )
        db.add(tx)
        db.flush()
        db.add(
            Receipt(
                transaction_id=tx.id,
                merchant_id=merchant.id,
                receipt_number=f"RCPT-SEED-{merchant.id:03d}",
                payload_json={
                    "reference": tx.reference,
                    "amount": str(tx.amount),
                    "merchant_name": merchant.business_name,
                    "evidence_type": "Verified QR",
                    "evidence_source": "verified_qr",
                    "evidence_confidence": "1.00",
                    "settlement_status": "Verified settlement",
                },
            )
        )
        db.add_all(
            [
                LedgerEntry(
                    wallet_id=wallet.id,
                    transaction_id=tx.id,
                    pocket="operating",
                    entry_type="credit",
                    amount=Decimal("20.00"),
                    balance_after=Decimal(str(200 + index * 75)),
                    narrative="Seed operating allocation",
                ),
                LedgerEntry(
                    wallet_id=wallet.id,
                    transaction_id=tx.id,
                    pocket="savings",
                    entry_type="credit",
                    amount=Decimal("5.00"),
                    balance_after=Decimal(str(35 + index * 18)),
                    narrative="Seed savings allocation",
                ),
                LedgerEntry(
                    wallet_id=wallet.id,
                    transaction_id=tx.id,
                    pocket="growth",
                    entry_type="credit",
                    amount=Decimal("3.00"),
                    balance_after=Decimal(str(18 + index * 12)),
                    narrative="Seed growth allocation",
                ),
            ]
        )

    db.add_all(
        [
            Offer(
                merchant_id=merchants[0].id,
                offer_type="insurance_stock_cover",
                title="Stock Cover",
                description="Protect market inventory against theft and fire.",
                eligibility_reason="Steady weekly inflows detected.",
                quote_amount=Decimal("7.50"),
            ),
            Offer(
                merchant_id=merchants[1].id,
                offer_type="device_cover",
                title="Device Cover",
                description="Protect your repair and payment device kit.",
                eligibility_reason="Device-reliant merchant profile.",
                quote_amount=Decimal("5.00"),
            ),
        ]
    )
    db.add(
        FraudAlert(
            merchant_id=merchants[1].id,
            severity="medium",
            rule_code="RAPID_REPEAT_TX",
            message="Demo alert: clustered payments from the same device pattern.",
        )
    )
    db.commit()
