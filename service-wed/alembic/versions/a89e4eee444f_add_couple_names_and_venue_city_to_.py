"""add couple names and venue city to wedding

Revision ID: a89e4eee444f
Revises: f53fae8036d8
Create Date: 2026-07-10 09:35:51.597486

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a89e4eee444f"
down_revision: Union[str, Sequence[str], None] = "f53fae8036d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("wedding", sa.Column("venue_city", sa.Text(), nullable=True))
    op.add_column("wedding", sa.Column("bride_first_name", sa.Text(), nullable=True))
    op.add_column("wedding", sa.Column("groom_first_name", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("wedding", "groom_first_name")
    op.drop_column("wedding", "bride_first_name")
    op.drop_column("wedding", "venue_city")
