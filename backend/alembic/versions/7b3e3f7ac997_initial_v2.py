"""initial_v2 — post-migration schema (no KYC, SMS auth, MDM fields)

Revision ID: 7b3e3f7ac997
"""
from collections.abc import Sequence
from alembic import op
from app.models import Base

revision: str = "7b3e3f7ac997"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())

def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
