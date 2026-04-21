# ZB Vaka

ZB Vaka is a hackathon-grade fintech prototype for Zimbabwe's informal economy. It turns verified QR payments and merchant-declared cash sales into financial evidence that powers wallet automation, trust scoring, fraud signals, and embedded protection offers.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, Recharts, QR rendering
- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic
- Data: PostgreSQL, Redis
- Infra: Docker Compose

## Repo Layout

- `apps/web`: judge and merchant web experience
- `apps/api`: FastAPI API and domain services
- `packages/i18n`: English, Shona, Ndebele, and Tshivenda dictionaries
- `packages/ui`: shared utility code
- `infra`: Docker Compose and environment examples
- `docs`: architecture, API, deployment, demo, and seed notes

## Quick Start

Prerequisites:

- Node 22 or 24 recommended for Next.js build and dev
- Python 3.12
- Docker Desktop

1. Start data services:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

2. Create the backend venv and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -e apps\api
```

3. Run migrations and seed demo data:

```bash
cd apps/api
..\..\.venv\Scripts\python -m alembic upgrade head
..\..\.venv\Scripts\python -c "from app.db.session import SessionLocal; from app.services.seed import seed_database; db=SessionLocal(); seed_database(db); db.close()"
```

4. Start the API:

```bash
cd apps/api
..\..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

5. Install frontend dependencies and run the web app:

```bash
npm install
npm run lint:web     # Run ESLint checks
npm run test:web     # Run Vitest suite
npm run dev:web      # Start Next.js dev server
```

6. Open `http://localhost:3000`

Seeded logins:

- `admin@zbvaka.co.zw` / `Admin123!`
- `tariro@zbvaka.co.zw` / `Merchant123!`
- `sibusiso@zbvaka.co.zw` / `Merchant123!`
- `rudo@zbvaka.co.zw` / `Merchant123!`

## Hybrid Evidence Model

- `verified_qr`: highest-confidence evidence captured through the mocked QR payment flow
- `declared_cash`: merchant-recorded cash sales that still count, but with lower confidence

The trust engine weights verified QR evidence more heavily than declared cash evidence so cash-heavy merchants can build a history without overstating confidence.

## What Is Mocked

- payment rails and settlement confirmation
- insurance underwriting
- investment execution

Everything after sale confirmation is persisted and processed as if the rails or merchant evidence had been accepted into the platform.

## Docs

- `docs/architecture.md`
- `docs/api.md`
- `docs/demo-script.md`
- `docs/deployment.md`
- `docs/seed-data.md`
- `docs/production-path.md`
