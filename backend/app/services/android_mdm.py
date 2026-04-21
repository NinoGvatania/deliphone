"""Google Android Management API client.

Manages device enrollment, policy application, and remote commands.
Uses service account credentials from GOOGLE_MDM_SERVICE_ACCOUNT_JSON_PATH.
"""

from __future__ import annotations

from pathlib import Path

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("mdm")

SCOPES = ["https://www.googleapis.com/auth/androidmanagement"]
BASE_URL = "https://androidmanagement.googleapis.com/v1"


class AndroidMDMClient:
    def __init__(self):
        self.enterprise_name = f"enterprises/{settings.GOOGLE_MDM_ENTERPRISE_ID}"
        self._credentials = None
        self._load_credentials()

    def _load_credentials(self):
        sa_path = settings.GOOGLE_MDM_SERVICE_ACCOUNT_JSON_PATH
        if not sa_path or not Path(sa_path).exists():
            logger.warning("mdm.no_credentials", path=sa_path)
            return
        self._credentials = service_account.Credentials.from_service_account_file(
            sa_path, scopes=SCOPES
        )

    def _get_token(self) -> str | None:
        if not self._credentials:
            return None
        if not self._credentials.token or self._credentials.expired:
            self._credentials.refresh(GoogleAuthRequest())
        return self._credentials.token

    async def _request(
        self, method: str, path: str, json_body: dict | None = None
    ) -> dict:
        token = self._get_token()
        if not token:
            logger.error("mdm.no_token")
            return {"error": "MDM not configured"}
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient() as client:
            resp = await client.request(
                method,
                f"{BASE_URL}/{path}",
                json=json_body,
                headers=headers,
                timeout=30.0,
            )
            resp.raise_for_status()
            return resp.json() if resp.content else {}

    async def health_check(self) -> dict:
        try:
            data = await self._request("GET", self.enterprise_name)
            return {
                "status": "ok",
                "enterprise_name": data.get("name"),
                "display_name": data.get("enterpriseDisplayName"),
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # --- Policies ---

    async def create_policy(self, policy_id: str, policy_data: dict) -> dict:
        return await self._request(
            "PATCH",
            f"{self.enterprise_name}/policies/{policy_id}",
            json_body=policy_data,
        )

    async def get_policy(self, policy_id: str) -> dict:
        return await self._request("GET", f"{self.enterprise_name}/policies/{policy_id}")

    async def apply_policy_to_device(self, device_name: str, policy_id: str) -> dict:
        return await self._request(
            "PATCH",
            f"{device_name}?updateMask=policyName",
            json_body={"policyName": f"{self.enterprise_name}/policies/{policy_id}"},
        )

    # --- Enrollment ---

    async def create_enrollment_token(
        self, policy_id: str, duration: str = "3600s"
    ) -> dict:
        return await self._request(
            "POST",
            f"{self.enterprise_name}/enrollmentTokens",
            json_body={
                "policyName": f"{self.enterprise_name}/policies/{policy_id}",
                "duration": duration,
            },
        )

    # --- Devices ---

    async def list_devices(self) -> list[dict]:
        data = await self._request("GET", f"{self.enterprise_name}/devices")
        return data.get("devices", [])

    async def get_device(self, device_name: str) -> dict:
        return await self._request("GET", device_name)

    async def delete_device(self, device_name: str) -> dict:
        return await self._request("DELETE", device_name)

    # --- Commands ---

    async def lock_device(self, device_name: str) -> dict:
        """Lock device screen."""
        return await self._request(
            "POST",
            f"{device_name}:issueCommand",
            json_body={"type": "LOCK"},
        )

    async def reboot_device(self, device_name: str) -> dict:
        return await self._request(
            "POST",
            f"{device_name}:issueCommand",
            json_body={"type": "REBOOT"},
        )

    async def wipe_device(self, device_name: str) -> dict:
        """Factory reset. Use with extreme caution."""
        return await self._request(
            "DELETE", f"{device_name}?wipeDataFlags=WIPE_EXTERNAL_STORAGE"
        )

    async def reset_password(self, device_name: str) -> dict:
        return await self._request(
            "POST",
            f"{device_name}:issueCommand",
            json_body={"type": "RESET_PASSWORD", "newPassword": ""},
        )


_client: AndroidMDMClient | None = None


def get_mdm_client() -> AndroidMDMClient:
    global _client
    if _client is None:
        _client = AndroidMDMClient()
    return _client
