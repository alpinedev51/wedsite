"""add physical_address to households

Revision ID: d4e1b7c9a215
Revises: c3d9e2a41b7f
Create Date: 2026-11-02 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e1b7c9a215"
down_revision: Union[str, Sequence[str], None] = "c3d9e2a41b7f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "households",
        sa.Column("physical_address", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("households", "physical_address")
