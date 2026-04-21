# Deployment

## Frontend on Vercel

Project root:

- `apps/web`

Environment variable:

- `NEXT_PUBLIC_API_BASE_URL=https://your-api-host/api/v1`

Build settings:

- framework preset: Next.js
- install command: `npm install`
- build command: `npm run build`

If using the monorepo root in Vercel instead of the app root:

- root directory: `apps/web`

## Backend

Deploy the FastAPI app to Railway, Render, Fly.io, or another container platform.

Required environment variables:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `FRONTEND_URL`

Run:

- `alembic upgrade head`
- `python -c "from app.db.session import SessionLocal; from app.services.seed import seed_database; db=SessionLocal(); seed_database(db); db.close()"`
- `uvicorn app.main:app --host 0.0.0.0 --port 8000`

