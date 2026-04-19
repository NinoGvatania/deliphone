"""initial schema

Revision ID: 537f2396e29a
Revises:
Create Date: 2026-04-19 02:09:51.248149

All 25 tables from SPEC §13.2 (users with Telegram auth, no phone/SMS)
plus registration_sessions for partner-kiosk onboarding.

Uses metadata.create_all for correct topological ordering because the
schema has circular FKs (devices ↔ rentals, users ↔ kyc_submissions)
that Alembic's autogenerate can't sort.
"""

from collections.abc import Sequence

from alembic import op

# Import all models so they register on Base.metadata
from app.models import Base  # noqa: F401

revision: str = "537f2396e29a"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
