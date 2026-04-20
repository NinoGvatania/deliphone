"""MDM policy definitions for device lifecycle states.

Three policies map to SPEC §17 device custody states:
- pre_activation: locked down before client picks up
- normal: standard rental policy with kiosk-like restrictions
- inventory: full lockdown when device is in partner storage
"""

from __future__ import annotations

from app.core.logging import get_logger
from app.services.android_mdm import get_mdm_client

logger = get_logger("mdm_policies")

# --- Policy: pre-activation (device assigned but not yet picked up) ---
PRE_ACTIVATION_POLICY: dict = {
    "statusReportingSettings": {
        "applicationReportsEnabled": True,
        "deviceSettingsEnabled": True,
        "softwareInfoEnabled": True,
        "networkInfoEnabled": True,
        "displayInfoEnabled": True,
        "hardwareStatusEnabled": True,
    },
    "applications": [],
    "keyguardDisabledFeatures": ["ALL_FEATURES"],
    "maximumTimeToLock": 30000,
    "passwordRequirements": {"passwordMinimumLength": 0, "passwordQuality": "SOMETHING"},
    "funDisabled": True,
    "installUnknownSourcesAllowed": False,
    "modifyAccountsDisabled": True,
    "safeBootDisabled": True,
    "factoryResetDisabled": True,
    "statusBarDisabled": True,
    "bluetoothDisabled": False,
    "wifiConfigDisabled": True,
    "cameraDisabled": True,
}

# --- Policy: normal (active rental) ---
NORMAL_POLICY: dict = {
    "statusReportingSettings": {
        "applicationReportsEnabled": True,
        "deviceSettingsEnabled": True,
        "softwareInfoEnabled": True,
        "networkInfoEnabled": True,
        "displayInfoEnabled": True,
        "hardwareStatusEnabled": True,
    },
    "applications": [
        {
            "packageName": "com.android.chrome",
            "installType": "FORCE_INSTALLED",
        },
        {
            "packageName": "com.android.vending",
            "installType": "FORCE_INSTALLED",
        },
    ],
    "maximumTimeToLock": 300000,
    "passwordRequirements": {"passwordMinimumLength": 4, "passwordQuality": "SOMETHING"},
    "funDisabled": False,
    "installUnknownSourcesAllowed": False,
    "modifyAccountsDisabled": False,
    "safeBootDisabled": True,
    "factoryResetDisabled": True,
    "statusBarDisabled": False,
    "bluetoothDisabled": False,
    "wifiConfigDisabled": False,
    "cameraDisabled": False,
    "adjustVolumeDisabled": False,
}

# --- Policy: inventory (device returned, in partner storage) ---
INVENTORY_POLICY: dict = {
    "statusReportingSettings": {
        "applicationReportsEnabled": True,
        "deviceSettingsEnabled": True,
        "softwareInfoEnabled": True,
        "networkInfoEnabled": True,
        "displayInfoEnabled": True,
        "hardwareStatusEnabled": True,
    },
    "applications": [],
    "keyguardDisabledFeatures": ["ALL_FEATURES"],
    "maximumTimeToLock": 10000,
    "passwordRequirements": {"passwordMinimumLength": 0, "passwordQuality": "SOMETHING"},
    "funDisabled": True,
    "installUnknownSourcesAllowed": False,
    "modifyAccountsDisabled": True,
    "safeBootDisabled": True,
    "factoryResetDisabled": True,
    "statusBarDisabled": True,
    "bluetoothDisabled": True,
    "wifiConfigDisabled": True,
    "cameraDisabled": True,
    "adjustVolumeDisabled": True,
}

POLICIES = {
    "pre_activation": PRE_ACTIVATION_POLICY,
    "normal_policy": NORMAL_POLICY,
    "inventory_policy": INVENTORY_POLICY,
}


async def ensure_policies() -> dict[str, str]:
    """Create or update all three MDM policies in the enterprise. Returns status per policy."""
    client = get_mdm_client()
    results: dict[str, str] = {}

    for policy_id, policy_data in POLICIES.items():
        try:
            await client.create_policy(policy_id, policy_data)
            results[policy_id] = "ok"
            logger.info("mdm_policies.upserted", policy_id=policy_id)
        except Exception as e:
            results[policy_id] = f"error: {e}"
            logger.error("mdm_policies.failed", policy_id=policy_id, error=str(e))

    return results
