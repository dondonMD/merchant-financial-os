"""hybrid evidence support"""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0002"
down_revision = "20260417_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("evidence_source", sa.String(length=24), nullable=False, server_default="verified_qr"))
    op.add_column("transactions", sa.Column("evidence_confidence", sa.Numeric(4, 2), nullable=False, server_default="1.00"))
    op.add_column("transactions", sa.Column("category", sa.String(length=80), nullable=True))
    op.add_column("transactions", sa.Column("note", sa.String(length=240), nullable=True))
    op.add_column("transactions", sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.add_column("trust_scores", sa.Column("inputs_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")))

    op.execute("UPDATE transactions SET recorded_at = created_at WHERE recorded_at IS NULL")
    op.execute("UPDATE trust_scores SET inputs_json = '{}'::json WHERE inputs_json IS NULL")

    op.alter_column("transactions", "evidence_source", server_default=None)
    op.alter_column("transactions", "evidence_confidence", server_default=None)
    op.alter_column("transactions", "recorded_at", server_default=None)
    op.alter_column("trust_scores", "inputs_json", server_default=None)


def downgrade() -> None:
    op.drop_column("trust_scores", "inputs_json")
    op.drop_column("transactions", "recorded_at")
    op.drop_column("transactions", "note")
    op.drop_column("transactions", "category")
    op.drop_column("transactions", "evidence_confidence")
    op.drop_column("transactions", "evidence_source")
