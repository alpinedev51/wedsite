# dashboard summary DTOs
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_invited: int
    total_attending: int
    total_declined: int
    households_pending: int
    days_until_wedding: int
