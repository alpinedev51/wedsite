# Aggregates every v1 controller into one router; controllers/router.py
# mounts this whole thing under /api/v1.
from fastapi import APIRouter

from service_wed.controllers.v1 import (
    auth,
    campaigns,
    dashboard,
    exports,
    health,
    households,
    invitations,
    rsvp,
    webhooks,
    wedding,
)

router = APIRouter()

router.include_router(health.router, prefix="/health")
router.include_router(auth.router, prefix="/auth")
router.include_router(invitations.router, prefix="/invitations")
router.include_router(rsvp.router, prefix="/rsvp")
router.include_router(wedding.public_router, prefix="/wedding")
router.include_router(campaigns.router, prefix="/admin/campaigns")
router.include_router(households.router, prefix="/admin/households")
router.include_router(dashboard.router, prefix="/admin/dashboard")
router.include_router(exports.router, prefix="/admin/exports")
router.include_router(wedding.admin_router, prefix="/admin/wedding")
router.include_router(webhooks.router, prefix="/webhooks")
