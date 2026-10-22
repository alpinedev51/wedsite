"""add send_blocked_since to email_messages

Revision ID: c3d9e2a41b7f
Revises: a89e4eee444f
Create Date: 2026-10-22 16:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d9e2a41b7f"
down_revision: Union[str, Sequence[str], None] = "a89e4eee444f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "email_messages",
        sa.Column("send_blocked_since", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("email_messages", "send_blocked_since")
