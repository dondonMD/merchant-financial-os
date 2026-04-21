# API

Base URL: `/api/v1`

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Merchant

- `POST /merchants/onboard`
- `GET /merchants/{merchant_id}`
- `PUT /merchants/{merchant_id}/allocation`

## Evidence Capture

- `POST /payments/mock`
  - mocked QR payment
  - stored as `verified_qr`
  - confidence `1.0`
- `POST /payments/cash`
  - merchant-recorded cash sale
  - stored as `declared_cash`
  - lower confidence than verified QR
- `GET /receipts/{transaction_id}`

## Admin

- `GET /admin/dashboard`

## Utilities

- `GET /health`
- `POST /seed`

## Response Contract

All successful responses follow:

```json
{
  "success": true,
  "data": {}
}
```

## Trust Semantics

- trust is an internal behavioural readiness score
- verified QR activity counts more than merchant-declared cash activity
- score inputs are rules-based and explainable
