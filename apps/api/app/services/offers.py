from __future__ import annotations

from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.merchant import Merchant, TrustScore, Wallet
from app.models.offer import Offer


def recompute_offers(db: Session, merchant: Merchant) -> list[Offer]:
    db.execute(delete(Offer).where(Offer.merchant_id == merchant.id))
    trust = db.scalar(select(TrustScore).where(TrustScore.merchant_id == merchant.id))
    wallet = db.scalar(select(Wallet).where(Wallet.merchant_id == merchant.id))
    offers: list[Offer] = []
    score = trust.score if trust else 0
    savings_balance = Decimal(str(wallet.savings_balance if wallet else 0))
    growth_balance = Decimal(str(wallet.growth_balance if wallet else 0))

    if score >= 45:
        offers.append(
            Offer(
                merchant_id=merchant.id,
                offer_type="insurance_stock_cover",
                title="Stock Cover",
                description="Protect your stock against fire, theft, and accidental damage.",
                eligibility_reason="Unlocked by steady QR transaction evidence.",
                quote_amount=Decimal("7.50"),
            )
        )
    if score >= 60:
        offers.append(
            Offer(
                merchant_id=merchant.id,
                offer_type="hospital_cash",
                title="Hospital Cash",
                description="Daily cash support during hospital stays for you or your household.",
                eligibility_reason="Stable payment history and improving trust score.",
                quote_amount=Decimal("4.20"),
            )
        )
    if growth_balance >= Decimal("50.00"):
        offers.append(
            Offer(
                merchant_id=merchant.id,
                offer_type="growth_nudge",
                title="Growth Pocket Momentum",
                description="You are building expansion capital. Consider adding 1% more to growth.",
                eligibility_reason="Growth pocket has meaningful sustained value.",
                quote_amount=Decimal("0.00"),
            )
        )
    if savings_balance >= Decimal("40.00"):
        offers.append(
            Offer(
                merchant_id=merchant.id,
                offer_type="savings_nudge",
                title="Emergency Buffer Milestone",
                description="Your emergency pocket can now absorb short cash flow shocks.",
                eligibility_reason="Savings discipline is visible in wallet activity.",
                quote_amount=Decimal("0.00"),
            )
        )
    for offer in offers:
        db.add(offer)
    return offers

