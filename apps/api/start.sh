#!/bin/sh
set -eu

python -m alembic upgrade head
python -c "from app.db.session import SessionLocal; from app.services.seed import seed_database; db=SessionLocal(); seed_database(db); db.close()"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
