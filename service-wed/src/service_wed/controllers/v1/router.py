# Aggregates every v1 controller into one router; controllers/router.py
# mounts this whole thing under /api/v1. dashboard.py and exports.py aren't
# included yet -- their backing services (DashboardService doesn't exist;
# ExportService is still a one-line stub) haven't been written.
from fastapi import APIRouter

from service_wed.controllers.v1 import (
    auth,
    campaigns,
    health,
    households,
    invitations,
    rsvp,
    webhooks,
)

router = APIRouter()

router.include_router(health.router, prefix="/health")
router.include_router(auth.router, prefix="/auth")
router.include_router(invitations.router, prefix="/invitations")
router.include_router(rsvp.router, prefix="/rsvp")
router.include_router(campaigns.router, prefix="/admin/campaigns")
router.include_router(households.router, prefix="/admin/households")
router.include_router(webhooks.router, prefix="/webhooks")
