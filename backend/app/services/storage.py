"""S3-compatible storage service (MinIO in dev, Selectel/Yandex in prod).

Buckets:
  - kyc-documents: passport photos, selfies, video
  - device-photos: 6-angle device photos at issue/return
  - incident-evidence: damage photos, police reports
  - contracts: generated HTML acts
"""

from __future__ import annotations

import boto3
from botocore.config import Config as BotoConfig

from app.core.config import settings

BUCKETS = ["kyc-documents", "device-photos", "incident-evidence", "contracts"]


class StorageService:
    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=BotoConfig(signature_version="s3v4"),
        )

    def ensure_buckets(self) -> None:
        """Create buckets if they don't exist (idempotent)."""
        existing = {b["Name"] for b in self._client.list_buckets().get("Buckets", [])}
        for bucket in BUCKETS:
            if bucket not in existing:
                self._client.create_bucket(Bucket=bucket)

    def generate_upload_url(
        self,
        bucket: str,
        key: str,
        content_type: str = "image/jpeg",
        ttl: int = 900,
    ) -> str:
        """Presigned PUT URL for direct frontend upload. TTL default 15 min."""
        return self._client.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=ttl,
        )

    def generate_read_url(self, bucket: str, key: str, ttl: int = 3600) -> str:
        """Presigned GET URL for viewing. TTL default 1 hour."""
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=ttl,
        )

    def head_object(self, bucket: str, key: str) -> bool:
        """Check if object exists."""
        try:
            self._client.head_object(Bucket=bucket, Key=key)
            return True
        except Exception:
            return False

    def upload_file(
        self,
        bucket: str,
        key: str,
        data: bytes,
        content_type: str = "image/jpeg",
    ) -> None:
        """Upload file directly from backend (for partner proxy uploads)."""
        self._client.put_object(
            Bucket=bucket, Key=key, Body=data, ContentType=content_type,
        )

    def delete_object(self, bucket: str, key: str) -> None:
        self._client.delete_object(Bucket=bucket, Key=key)


_storage: StorageService | None = None


def get_storage() -> StorageService:
    global _storage  # noqa: PLW0603
    if _storage is None:
        _storage = StorageService()
        _storage.ensure_buckets()
    return _storage
