"""restore recorded_at database default"""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0003"
down_revision = "20260421_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("transactions", "recorded_at", server_default=sa.text("now()"))


def downgrade() -> None:
    op.alter_column("transactions", "recorded_at", server_default=None)
