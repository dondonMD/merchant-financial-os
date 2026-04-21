from decimal import Decimal
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.services.trust import calculate_trust_metrics


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"{settings.api_v1_prefix}/health")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ok"


@pytest.mark.asyncio
async def test_api_docs_accessible():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/docs")
    assert response.status_code == 200


def test_trust_metrics_weight_verified_activity_more_than_declared():
    verified = SimpleNamespace(amount=Decimal("50.00"), evidence_confidence=Decimal("1.00"), evidence_source="verified_qr")
    declared = SimpleNamespace(amount=Decimal("50.00"), evidence_confidence=Decimal("0.35"), evidence_source="declared_cash")

    verified_score, _, verified_breakdown, verified_inputs = calculate_trust_metrics(
        [verified],
        savings_balance=Decimal("10.00"),
        fraud_count=0,
        has_known_device=True,
    )
    declared_score, _, declared_breakdown, declared_inputs = calculate_trust_metrics(
        [declared],
        savings_balance=Decimal("10.00"),
        fraud_count=0,
        has_known_device=True,
    )

    assert verified_score > declared_score
    assert verified_breakdown["payment_frequency"] > declared_breakdown["payment_frequency"]
    assert verified_inputs["weighted_activity_count"] > declared_inputs["weighted_activity_count"]


def test_trust_metrics_report_verified_and_declared_counts():
    transactions = [
        SimpleNamespace(amount=Decimal("40.00"), evidence_confidence=Decimal("1.00"), evidence_source="verified_qr"),
        SimpleNamespace(amount=Decimal("25.00"), evidence_confidence=Decimal("0.35"), evidence_source="declared_cash"),
        SimpleNamespace(amount=Decimal("30.00"), evidence_confidence=Decimal("0.35"), evidence_source="declared_cash"),
    ]

    _, _, _, raw_inputs = calculate_trust_metrics(
        transactions,
        savings_balance=Decimal("20.00"),
        fraud_count=1,
        has_known_device=True,
    )

    assert raw_inputs["verified_transaction_count"] == 1
    assert raw_inputs["declared_cash_count"] == 2
    assert raw_inputs["active_fraud_count"] == 1
