from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select

from app.core.security import (
    create_access_token,
    create_refresh_token,
    fingerprint,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.fraud_alert import FraudAlert
from app.models.merchant import AllocationRule, Merchant, TrustScore, Wallet
from app.models.offer import Offer
from app.models.transaction import LedgerEntry, Receipt, Transaction
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, RefreshRequest
from app.schemas.merchant import AllocationRuleUpdate, MerchantCreate
from app.schemas.payment import CashSaleRequest, MockPaymentRequest
from app.services.audit import write_audit_log
from app.services.payments import evidence_label, process_cash_sale, process_mock_payment
from app.services.seed import seed_database
from app.services.trust import normalize_breakdown_keys
from app.utils.dependencies import DbDep, require_role
from app.utils.rate_limit import enforce_rate_limit

router = APIRouter()


def serialize_wallet(wallet: Wallet, rule: AllocationRule) -> dict:
    return {
        "operating_balance": float(wallet.operating_balance),
        "savings_balance": float(wallet.savings_balance),
        "growth_balance": float(wallet.growth_balance),
        "currency": wallet.currency,
        "allocation_rule": {
            "save_percent": float(rule.save_percent),
            "growth_percent": float(rule.growth_percent),
            "round_up_enabled": rule.round_up_enabled,
        },
    }


def serialize_trust(trust: TrustScore | None) -> dict:
    if not trust:
        return {"score": 0, "tier": "Starter", "breakdown": {}, "raw_inputs": {}, "updated_at": None}
    return {
        "score": trust.score,
        "tier": trust.tier,
        "breakdown": normalize_breakdown_keys(trust.breakdown_json),
        "raw_inputs": trust.inputs_json or {},
        "updated_at": trust.updated_at.isoformat() if trust.updated_at else None,
    }


def serialize_transaction(tx: Transaction) -> dict:
    return {
        "id": tx.id,
        "amount": float(tx.amount),
        "status": tx.status,
        "reference": tx.reference,
        "external_reference": tx.external_reference,
        "payer_name": tx.payer_name,
        "payer_phone": tx.payer_phone,
        "category": tx.category,
        "note": tx.note,
        "evidence_source": tx.evidence_source,
        "evidence_confidence": float(tx.evidence_confidence),
        "evidence_label": evidence_label(tx.evidence_source),
        "created_at": tx.created_at.isoformat(),
        "recorded_at": tx.recorded_at.isoformat() if tx.recorded_at else tx.created_at.isoformat(),
    }


@router.get("/health")
async def health() -> dict:
    return {"success": True, "data": {"status": "ok"}}


@router.post("/seed")
def seed(db: DbDep) -> dict:
    seed_database(db)
    return {"success": True, "data": {"seeded": True}}


@router.post("/auth/login")
async def login(payload: LoginRequest, db: DbDep) -> dict:
    await enforce_rate_limit(f"login:{payload.email}", limit=8, window_seconds=60)
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(str(user.id), user.role)
    refresh_token, expires_at = create_refresh_token(str(user.id))
    db.add(RefreshToken(user_id=user.id, token_hash=hash_token(refresh_token), expires_at=expires_at))
    write_audit_log(db, action="login", entity_type="user", entity_id=str(user.id), metadata={"email": user.email}, user_id=user.id, merchant_id=user.merchant_id)
    db.commit()
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": user.role,
            "merchant_id": user.merchant_id,
        },
    }


@router.post("/auth/refresh")
def refresh(payload: RefreshRequest, db: DbDep) -> dict:
    token_hash_value = hash_token(payload.refresh_token)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash_value, RefreshToken.revoked_at.is_(None)))
    if not stored or stored.expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    user = db.scalar(select(User).where(User.id == stored.user_id))
    access_token = create_access_token(str(user.id), user.role)
    return {"success": True, "data": {"access_token": access_token, "token_type": "bearer", "role": user.role, "merchant_id": user.merchant_id}}


@router.post("/auth/logout")
def logout(payload: RefreshRequest, db: DbDep) -> dict:
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(payload.refresh_token)))
    if stored:
        stored.revoked_at = datetime.now(UTC)
        db.commit()
    return {"success": True, "data": {"logged_out": True}}


@router.get("/auth/me")
def me(user: Annotated[User, Depends(require_role("merchant", "admin"))]) -> dict:
    return {"success": True, "data": {"id": user.id, "email": user.email, "role": user.role, "merchant_id": user.merchant_id}}


@router.post("/merchants/onboard")
def onboard_merchant(payload: MerchantCreate, db: DbDep) -> dict:
    if db.scalar(select(Merchant).where((Merchant.phone == payload.phone) | (Merchant.national_id == payload.national_id))):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Merchant already exists")
    merchant = Merchant(
        full_name=payload.full_name,
        phone=payload.phone,
        business_name=payload.business_name,
        business_type=payload.business_type,
        national_id=payload.national_id,
        location=payload.location,
        language_preference=payload.language_preference,
        device_hash=fingerprint(payload.device_id) if payload.device_id else None,
    )
    db.add(merchant)
    db.flush()
    wallet = Wallet(merchant_id=merchant.id)
    rule = AllocationRule(merchant_id=merchant.id)
    trust = TrustScore(merchant_id=merchant.id, score=32, tier="Starter", breakdown_json={"transaction_frequency": 0})
    user = User(email=payload.email, password_hash=hash_password(payload.password), role="merchant", merchant_id=merchant.id)
    db.add_all([wallet, rule, trust, user])
    write_audit_log(db, action="merchant_onboarded", entity_type="merchant", entity_id=str(merchant.id), metadata={"business_name": merchant.business_name}, merchant_id=merchant.id)
    db.commit()
    return {"success": True, "data": {"merchant_id": merchant.id, "user_email": user.email}}


@router.get("/merchants/{merchant_id}")
def merchant_detail(
    merchant_id: int,
    db: DbDep,
    user: Annotated[User, Depends(require_role("merchant", "admin"))],
) -> dict:
    if user.role == "merchant" and user.merchant_id != merchant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    merchant = db.scalar(select(Merchant).where(Merchant.id == merchant_id))
    if not merchant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")
    wallet = db.scalar(select(Wallet).where(Wallet.merchant_id == merchant_id))
    rule = db.scalar(select(AllocationRule).where(AllocationRule.merchant_id == merchant_id))
    trust = db.scalar(select(TrustScore).where(TrustScore.merchant_id == merchant_id))
    offers = db.scalars(select(Offer).where(Offer.merchant_id == merchant_id).order_by(desc(Offer.created_at))).all()
    alerts = db.scalars(select(FraudAlert).where(FraudAlert.merchant_id == merchant_id).order_by(desc(FraudAlert.created_at))).all()
    transactions = db.scalars(select(Transaction).where(Transaction.merchant_id == merchant_id).order_by(desc(Transaction.created_at)).limit(12)).all()
    ledger = db.scalars(select(LedgerEntry).where(LedgerEntry.wallet_id == wallet.id).order_by(desc(LedgerEntry.created_at)).limit(18)).all()
    verified_transactions = [tx for tx in transactions if tx.evidence_source == "verified_qr"]
    declared_transactions = [tx for tx in transactions if tx.evidence_source == "declared_cash"]
    return {
        "success": True,
        "data": {
            "merchant": {
                "id": merchant.id,
                "full_name": merchant.full_name,
                "business_name": merchant.business_name,
                "business_type": merchant.business_type,
                "location": merchant.location,
                "phone": merchant.phone,
                "language_preference": merchant.language_preference,
            },
            "wallet": serialize_wallet(wallet, rule),
            "trust_score": serialize_trust(trust),
            "offers": [
                {
                    "id": offer.id,
                    "offer_type": offer.offer_type,
                    "title": offer.title,
                    "description": offer.description,
                    "eligibility_reason": offer.eligibility_reason,
                    "quote_amount": float(offer.quote_amount),
                    "status": offer.status,
                }
                for offer in offers
            ],
            "fraud_alerts": [
                {
                    "id": alert.id,
                    "severity": alert.severity,
                    "rule_code": alert.rule_code,
                    "message": alert.message,
                    "status": alert.status,
                    "created_at": alert.created_at.isoformat(),
                }
                for alert in alerts
            ],
            "transactions": [
                serialize_transaction(tx)
                for tx in transactions
            ],
            "ledger_entries": [
                {
                    "id": entry.id,
                    "pocket": entry.pocket,
                    "entry_type": entry.entry_type,
                    "amount": float(entry.amount),
                    "balance_after": float(entry.balance_after),
                    "narrative": entry.narrative,
                    "created_at": entry.created_at.isoformat(),
                }
                for entry in ledger
            ],
            "evidence_summary": {
                "verified_transaction_count": len(verified_transactions),
                "declared_cash_count": len(declared_transactions),
                "verified_activity_value": float(sum(Decimal(str(tx.amount)) for tx in verified_transactions)),
                "declared_activity_value": float(sum(Decimal(str(tx.amount)) for tx in declared_transactions)),
            },
            "qr_profile": {
                "merchant_id": merchant.id,
                "business_name": merchant.business_name,
                "qr_payload": f"zbvaka://merchant/{merchant.id}",
            },
        },
    }


@router.put("/merchants/{merchant_id}/allocation")
def update_allocation(
    merchant_id: int,
    payload: AllocationRuleUpdate,
    db: DbDep,
    user: Annotated[User, Depends(require_role("merchant"))],
) -> dict:
    if user.merchant_id != merchant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    rule = db.scalar(select(AllocationRule).where(AllocationRule.merchant_id == merchant_id))
    rule.save_percent = payload.save_percent
    rule.growth_percent = payload.growth_percent
    rule.round_up_enabled = payload.round_up_enabled
    write_audit_log(
        db,
        action="allocation_updated",
        entity_type="allocation_rule",
        entity_id=str(rule.id),
        metadata={"save_percent": str(payload.save_percent), "growth_percent": str(payload.growth_percent)},
        user_id=user.id,
        merchant_id=merchant_id,
    )
    db.commit()
    return {"success": True, "data": {"updated": True}}


@router.post("/payments/mock")
async def mock_payment(payload: MockPaymentRequest, db: DbDep) -> dict:
    await enforce_rate_limit(f"payment:{payload.merchant_id}:{payload.device_id}", limit=12, window_seconds=60)
    merchant = db.scalar(select(Merchant).where(Merchant.id == payload.merchant_id))
    if not merchant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")
    idempotency_key = f"idempotency:{payload.idempotency_key}"
    from app.db.redis import redis_client

    created = await redis_client.set(idempotency_key, "used", ex=300, nx=True)
    if not created:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate payment confirmation")
    payload.device_id = fingerprint(payload.device_id)
    if merchant.device_hash is None:
        merchant.device_hash = payload.device_id
    result = process_mock_payment(db, merchant, payload)
    db.commit()
    return {
        "success": True,
        "data": {
            "transaction": {
                "id": result["transaction"].id,
                "reference": result["transaction"].reference,
                "amount": float(result["transaction"].amount),
                "evidence_source": result["transaction"].evidence_source,
                "evidence_confidence": float(result["transaction"].evidence_confidence),
                "evidence_label": evidence_label(result["transaction"].evidence_source),
                "created_at": result["transaction"].created_at.isoformat(),
            },
            "receipt": {
                "receipt_number": result["receipt"].receipt_number,
                "payload": result["receipt"].payload_json,
            },
            "allocation": {key: float(value) for key, value in result["allocation"].items()},
            "trust_score": serialize_trust(result["trust_score"]),
            "offers_count": len(result["offers"]),
            "fraud_alerts_count": len(result["fraud_alerts"]),
        },
    }


@router.post("/payments/cash")
async def cash_payment(
    payload: CashSaleRequest,
    db: DbDep,
    user: Annotated[User, Depends(require_role("merchant"))],
) -> dict:
    await enforce_rate_limit(f"cash:{user.merchant_id}:{payload.device_id}", limit=20, window_seconds=60)
    merchant = db.scalar(select(Merchant).where(Merchant.id == user.merchant_id))
    if not merchant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")
    payload.device_id = fingerprint(payload.device_id)
    if merchant.device_hash is None:
        merchant.device_hash = payload.device_id
    result = process_cash_sale(db, merchant, payload)
    db.commit()
    return {
        "success": True,
        "data": {
            "transaction": {
                "id": result["transaction"].id,
                "reference": result["transaction"].reference,
                "amount": float(result["transaction"].amount),
                "evidence_source": result["transaction"].evidence_source,
                "evidence_confidence": float(result["transaction"].evidence_confidence),
                "evidence_label": evidence_label(result["transaction"].evidence_source),
                "created_at": result["transaction"].created_at.isoformat(),
            },
            "receipt": {
                "receipt_number": result["receipt"].receipt_number,
                "payload": result["receipt"].payload_json,
            },
            "allocation": {key: float(value) for key, value in result["allocation"].items()},
            "trust_score": serialize_trust(result["trust_score"]),
            "offers_count": len(result["offers"]),
            "fraud_alerts_count": len(result["fraud_alerts"]),
        },
    }


@router.get("/receipts/{transaction_id}")
def receipt_detail(transaction_id: int, db: DbDep, user: Annotated[User, Depends(require_role("merchant", "admin"))]) -> dict:
    receipt = db.scalar(select(Receipt).where(Receipt.transaction_id == transaction_id))
    transaction = db.scalar(select(Transaction).where(Transaction.id == transaction_id))
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    if user.role == "merchant" and user.merchant_id != receipt.merchant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return {
        "success": True,
        "data": {
            "receipt_number": receipt.receipt_number,
            "payload": receipt.payload_json,
            "created_at": receipt.created_at.isoformat(),
            "evidence_source": transaction.evidence_source if transaction else None,
            "evidence_confidence": float(transaction.evidence_confidence) if transaction else None,
            "evidence_label": evidence_label(transaction.evidence_source) if transaction else None,
        },
    }


@router.get("/admin/dashboard")
def admin_dashboard(db: DbDep, user: Annotated[User, Depends(require_role("admin"))]) -> dict:
    merchant_count = db.scalar(select(func.count(Merchant.id))) or 0
    total_processed = db.scalar(select(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).where(Transaction.status == "success")) or Decimal("0.00")
    wallets = db.scalars(select(Wallet)).all()
    trust_scores = db.scalars(select(TrustScore)).all()
    offers = db.scalars(select(Offer).where(Offer.status == "active")).all()
    alerts = db.scalars(select(FraudAlert).order_by(desc(FraudAlert.created_at)).limit(8)).all()
    transactions = db.scalars(select(Transaction).order_by(desc(Transaction.created_at)).limit(10)).all()
    merchants = db.scalars(select(Merchant).order_by(Merchant.created_at.desc()).limit(10)).all()
    evidence_amounts = {
        "verified_qr": float(
            db.scalar(select(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).where(Transaction.evidence_source == "verified_qr"))
            or Decimal("0.00")
        ),
        "declared_cash": float(
            db.scalar(select(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).where(Transaction.evidence_source == "declared_cash"))
            or Decimal("0.00")
        ),
    }
    evidence_counts = {
        "verified_qr": db.scalar(select(func.count(Transaction.id)).where(Transaction.evidence_source == "verified_qr")) or 0,
        "declared_cash": db.scalar(select(func.count(Transaction.id)).where(Transaction.evidence_source == "declared_cash")) or 0,
    }
    return {
        "success": True,
        "data": {
            "metrics": {
                "total_merchants": merchant_count,
                "total_processed_payments": float(total_processed),
                "active_offers": len(offers),
                "open_fraud_alerts": len([a for a in alerts if a.status == "open"]),
                "verified_activity_value": evidence_amounts["verified_qr"],
                "declared_activity_value": evidence_amounts["declared_cash"],
            },
            "allocation_distribution": {
                "operating": float(sum(Decimal(str(w.operating_balance)) for w in wallets)),
                "savings": float(sum(Decimal(str(w.savings_balance)) for w in wallets)),
                "growth": float(sum(Decimal(str(w.growth_balance)) for w in wallets)),
            },
            "evidence_distribution": {
                "amounts": evidence_amounts,
                "counts": evidence_counts,
            },
            "trust_distribution": {
                "Starter": len([t for t in trust_scores if t.tier == "Starter"]),
                "Growing": len([t for t in trust_scores if t.tier == "Growing"]),
                "Trusted": len([t for t in trust_scores if t.tier == "Trusted"]),
                "Bankable": len([t for t in trust_scores if t.tier == "Bankable"]),
            },
            "recent_transactions": [
                serialize_transaction(tx) | {"merchant_id": tx.merchant_id}
                for tx in transactions
            ],
            "fraud_alerts": [
                {
                    "id": alert.id,
                    "merchant_id": alert.merchant_id,
                    "rule_code": alert.rule_code,
                    "message": alert.message,
                    "severity": alert.severity,
                }
                for alert in alerts
            ],
            "merchants": [
                {
                    "id": merchant.id,
                    "business_name": merchant.business_name,
                    "business_type": merchant.business_type,
                    "location": merchant.location,
                }
                for merchant in merchants
            ],
        },
    }
