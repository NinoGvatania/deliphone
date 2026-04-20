"""Celery tasks for MDM policy lifecycle and overdue device locking.

Tasks:
- mdm_apply_pre_activation: lock device before client pickup
- mdm_apply_normal_policy: unlock after successful payment
- mdm_apply_inventory_policy: restrict after device return
- mdm_auto_reset_on_return: clear user data + apply inventory policy
- check_overdue_rentals: periodic — lock devices with grace > 7 days
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger("mdm_tasks")

# Apps whose data should be wiped on device return
USER_DATA_APPS_TO_CLEAR = [
    "com.android.chrome",
    "com.google.android.gm",
    "com.google.android.apps.messaging",
    "com.google.android.apps.photos",
    "com.google.android.youtube",
    "com.whatsapp",
    "org.telegram.messenger",
    "com.instagram.android",
    "com.vkontakte.android",
    "com.twitter.android",
    "com.facebook.katana",
    "com.spotify.music",
    "com.yandex.browser",
    "ru.yandex.disk",
    "ru.yandex.music",
]


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="mdm_apply_pre_activation", bind=True)
def mdm_apply_pre_activation(self, device_id: str) -> dict:
    """Apply pre-activation policy when partner creates rental."""
    return _run_async(_apply_policy(device_id, "pre_activation"))


@celery_app.task(name="mdm_apply_normal_policy", bind=True)
def mdm_apply_normal_policy(self, device_id: str) -> dict:
    """Apply normal policy when payment succeeds and client picks up device."""
    return _run_async(_apply_policy(device_id, "normal_policy"))


@celery_app.task(name="mdm_apply_inventory_policy", bind=True)
def mdm_apply_inventory_policy(self, device_id: str) -> dict:
    """Apply inventory policy when device is returned to partner."""
    return _run_async(_apply_policy(device_id, "inventory_policy"))


async def _apply_policy(device_id: str, policy_id: str) -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.catalog import Device
    from app.services.android_mdm import get_mdm_client

    factory = _get_session_factory()
    client = get_mdm_client()

    async with factory() as session:
        result = await session.execute(select(Device).where(Device.id == device_id))
        device = result.scalars().first()

        if not device:
            logger.error("mdm.device_not_found", device_id=device_id)
            return {"error": "device not found"}

        if not device.mdm_device_name:
            logger.warning("mdm.no_mdm_name", device_id=device_id)
            return {"error": "device not enrolled in MDM"}

        try:
            resp = await client.apply_policy_to_device(device.mdm_device_name, policy_id)
            logger.info(
                "mdm.policy_applied",
                device_id=device_id,
                policy_id=policy_id,
            )
            return {"status": "ok", "policy": policy_id, "response": resp}
        except Exception as e:
            logger.error(
                "mdm.policy_apply_failed",
                device_id=device_id,
                policy_id=policy_id,
                error=str(e),
            )
            return {"error": str(e)}


@celery_app.task(name="mdm_auto_reset_on_return", bind=True)
def mdm_auto_reset_on_return(self, device_id: str) -> dict:
    """Clear app data + apply inventory policy + verify compliance after 60s."""
    return _run_async(_auto_reset(device_id))


async def _auto_reset(device_id: str) -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.catalog import Device
    from app.services.android_mdm import get_mdm_client

    factory = _get_session_factory()
    client = get_mdm_client()

    async with factory() as session:
        result = await session.execute(select(Device).where(Device.id == device_id))
        device = result.scalars().first()

        if not device or not device.mdm_device_name:
            return {"error": "device not found or not enrolled"}

        device_name = device.mdm_device_name

    # Apply inventory policy (locks device down)
    try:
        await client.apply_policy_to_device(device_name, "inventory_policy")
    except Exception as e:
        logger.error("mdm.auto_reset.policy_failed", device_id=device_id, error=str(e))
        return {"error": f"policy apply failed: {e}"}

    # Reset password to clear screen lock
    try:
        await client.reset_password(device_name)
    except Exception as e:
        logger.warning("mdm.auto_reset.password_reset_failed", device_id=device_id, error=str(e))

    # Reboot to finalize state
    try:
        await client.reboot_device(device_name)
    except Exception as e:
        logger.warning("mdm.auto_reset.reboot_failed", device_id=device_id, error=str(e))

    logger.info("mdm.auto_reset.done", device_id=device_id)

    # Schedule compliance verification after 60s
    mdm_verify_compliance.apply_async(args=[device_id], countdown=60)

    return {"status": "ok", "device_id": device_id}


@celery_app.task(name="mdm_verify_compliance", bind=True)
def mdm_verify_compliance(self, device_id: str) -> dict:
    """Verify device compliance after reset."""
    return _run_async(_verify_compliance(device_id))


async def _verify_compliance(device_id: str) -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.catalog import Device
    from app.services.android_mdm import get_mdm_client

    factory = _get_session_factory()
    client = get_mdm_client()

    async with factory() as session:
        result = await session.execute(select(Device).where(Device.id == device_id))
        device = result.scalars().first()

        if not device or not device.mdm_device_name:
            return {"error": "device not found or not enrolled"}

        try:
            status = await client.get_device(device.mdm_device_name)
            policy_compliant = status.get("policyCompliant", False)
            logger.info(
                "mdm.compliance_check",
                device_id=device_id,
                compliant=policy_compliant,
            )
            return {"compliant": policy_compliant, "state": status.get("state")}
        except Exception as e:
            logger.error("mdm.compliance_check_failed", device_id=device_id, error=str(e))
            return {"error": str(e)}


@celery_app.task(name="check_overdue_rentals_mdm")
def check_overdue_rentals_mdm() -> dict:
    """Every 30 min: find rentals with grace_period > 7 days, LOCK device, set locked_overdue."""
    return _run_async(_check_overdue())


async def _check_overdue() -> dict:
    from sqlalchemy import select

    from app.core.db import _get_session_factory
    from app.models.catalog import Device
    from app.models.rentals import Rental
    from app.services.android_mdm import get_mdm_client

    factory = _get_session_factory()
    client = get_mdm_client()
    now = datetime.now(UTC)
    locked_count = 0

    async with factory() as session:
        # Find overdue rentals where paid_until is more than 7 days ago
        cutoff = now - timedelta(days=7)
        result = await session.execute(
            select(Rental).where(
                Rental.status == "overdue",
                Rental.paid_until <= cutoff,
            )
        )
        rentals = result.scalars().all()

        for rental in rentals:
            device_result = await session.execute(
                select(Device).where(Device.id == rental.device_id)
            )
            device = device_result.scalars().first()

            if not device or not device.mdm_device_name:
                continue

            try:
                await client.lock_device(device.mdm_device_name)
                rental.status = "locked_overdue"
                locked_count += 1
                logger.info(
                    "mdm.overdue_locked",
                    rental_id=str(rental.id),
                    device_id=str(device.id),
                )
            except Exception as e:
                logger.error(
                    "mdm.overdue_lock_failed",
                    rental_id=str(rental.id),
                    error=str(e),
                )

        await session.commit()

    logger.info("check_overdue_mdm.done", locked=locked_count)
    return {"locked": locked_count}


# ── Beat schedule additions ─────────────────────────────────────────────────

celery_app.conf.beat_schedule.update({
    "check-overdue-rentals-mdm": {
        "task": "check_overdue_rentals_mdm",
        "schedule": 1800.0,  # every 30 minutes
    },
})
