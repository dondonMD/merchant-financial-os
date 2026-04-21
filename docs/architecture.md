# Architecture

ZB Vaka is a monorepo prototype with a Next.js App Router frontend and a FastAPI backend over PostgreSQL and Redis.

## Principles

- regulation-aligned architecture with mocked payment rails
- production-shaped boundaries without unnecessary microservices
- deterministic wallet allocation and auditability
- explainable trust scoring and offer recommendation logic
- hybrid evidence capture so verified QR counts more than merchant-declared cash
- secure defaults for hackathon scope: hashed passwords, JWT, refresh token storage, idempotency, rate limits, audit logs

## Components

- `apps/web`: landing page, merchant wallet, QR receive-money flow, cash-sale recording flow, multilingual experience, admin judge dashboard
- `apps/api`: auth, onboarding, merchant profile, wallet, QR payment simulator, cash-sale capture, ledger, receipts, weighted trust scoring, offers, fraud signals, seed endpoints
- `PostgreSQL`: system of record for merchants, wallets, transactions, evidence metadata, ledger, receipts, trust scores, offers, fraud alerts, audit logs, users
- `Redis`: rate limiting and idempotency windows

## Hybrid Evidence Model

- `verified_qr`: highest-confidence evidence captured through the mocked QR flow
- `declared_cash`: merchant-recorded cash sales captured as lower-confidence evidence
- trust inputs weight verified QR more heavily than declared cash so cash-heavy merchants can build history without overstating certainty

## Mocked Rails Versus Production

Current prototype:

- QR payload identifies a merchant profile
- customer simulator triggers `POST /payments/mock`
- cash sales are recorded through `POST /payments/cash`
- mocked settlement instantly posts a successful verified QR transaction

Production path:

- replace the `payments/mock` adapter with provider-specific initiation and webhook confirmation handlers
- preserve the same transaction, ledger, receipt, trust, offer, and fraud service layers
- keep declared-cash capture as a separate lower-confidence evidence path
- add reconciliation jobs, settlement statuses, and provider signature verification

## Trust Model

- internal behavioural readiness score
- rules-based and explainable
- recalculated after successful QR payments and recorded cash sales
- not a bureau credit score
- not a tax score
- weighted by evidence quality, with verified QR carrying more weight than merchant-declared cash

## Security Model

- password hashing
- short-lived access token plus stored refresh token hashes
- role model: `merchant`, `admin`
- route-level authorization checks
- Redis-backed rate limiting on login and sale capture
- Redis idempotency for QR payment confirmation
- device fingerprint persistence and anomaly rules
- audit logging on onboarding, login, allocation changes, QR payments, and cash-sale recording
