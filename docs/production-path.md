# ZB Vaka - Production Path Guide

This document outlines the roadmap required to move ZB Vaka from a hackathon prototype to a live fintech product integrated with Zimbabwe's financial ecosystem.

## 1. Payment Integration

The current system uses:

- `process_mock_payment` for verified QR simulation
- merchant-recorded cash capture for lower-confidence declared activity

Production steps:

- integrate ZB Bank or switching rails for real settlement
- add provider adapters for EcoCash, OneMoney, Telecash, and other mobile money rails
- replace synchronous mock settlement with asynchronous webhook confirmation
- keep declared cash as a separate evidence path rather than treating it as settlement-confirmed activity

## 2. Evidence and Reconciliation

Production should add:

- end-of-day reconciliation between declared cash, real digital settlements, and wallet positions
- stronger cashier or branch controls for merchant-declared cash
- optional supervisor approval for unusually high declared-cash entries

## 3. Compliance and Financial Security

- tiered KYC onboarding
- ID verification against trusted identity providers
- AML monitoring and sanctions screening
- stronger ledger integrity controls

## 4. Trust Model Hardening

Current trust score:

- is internal
- is behavioural
- is rules-based and explainable
- weights verified QR more heavily than merchant-declared cash

Production should add:

- versioned score policies
- audit trails for score changes
- reconciliation-aware trust adjustments
- policy review and compliance sign-off

## 5. Infrastructure and Scaling

- PostgreSQL PITR and replicas
- Redis HA for idempotency and throttling
- secret rotation with KMS
- monitoring with Sentry and Prometheus/Grafana

## 6. Testing and Operationalization

- expand unit and integration coverage around wallet allocation, trust weighting, and evidence capture
- add load testing for salary-day and market-hour spikes
- add operational dashboards for verified vs declared activity mix

## 7. Multilingual Delivery

The prototype now targets:

- English
- Shona
- Ndebele

Production should add:

- translation QA with native reviewers
- copy governance for compliance-sensitive wording
- end-to-end locale testing on every release
