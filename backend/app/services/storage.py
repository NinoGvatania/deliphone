"""S3-compatible storage service (MinIO in dev, Selectel/Yandex in prod).

Buckets:
  - kyc-documents: passport photos, selfies, video
  - device-photos: 6-angle device photos at issue/return
  - incident-evidence: damage photos, police reports
  - contracts: generated HTML acts

Two boto3 clients:
  - _client: uses S3_ENDPOINT (docker-internal, e.g. http://minio:9000)
    for server-side operations (upload, head, delete)
  - _public_client: uses S3_PUBLIC_ENDPOINT (e.g. http://localhost:9000)
    for generating presigned URLs that browsers can reach
"""

from __future__ import annotations

import boto3
from botocore.config import Config as BotoConfig

from app.core.config import settings

BUCKETS = ["kyc-documents", "device-photos", "incident-evidence", "contracts"]


class StorageService:
    def __init__(self) -> None:
        cfg = BotoConfig(signature_version="s3v4")
        common = dict(
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=cfg,
        )
        # Internal client — for server-side operations
        self._client = boto3.client("s3", endpoint_url=settings.S3_ENDPOINT, **common)
        # Public client — generates URLs reachable from the browser
        public_endpoint = settings.S3_PUBLIC_ENDPOINT or settings.S3_ENDPOINT
        self._public_client = boto3.client("s3", endpoint_url=public_endpoint, **common)

    def ensure_buckets(self) -> None:
        existing = {b["Name"] for b in self._client.list_buckets().get("Buckets", [])}
        for bucket in BUCKETS:
            if bucket not in existing:
                self._client.create_bucket(Bucket=bucket)

    def generate_upload_url(
        self, bucket: str, key: str, content_type: str = "image/jpeg", ttl: int = 900,
    ) -> str:
        """Presigned PUT URL for direct frontend upload (uses public endpoint)."""
        return self._public_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=ttl,
        )

    def generate_read_url(self, bucket: str, key: str, ttl: int = 3600) -> str:
        """Presigned GET URL for viewing (uses public endpoint)."""
        return self._public_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=ttl,
        )

    def head_object(self, bucket: str, key: str) -> bool:
        try:
            self._client.head_object(Bucket=bucket, Key=key)
            return True
        except Exception:
            return False

    def upload_file(self, bucket: str, key: str, data: bytes, content_type: str = "image/jpeg") -> None:
        self._client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)

    def delete_object(self, bucket: str, key: str) -> None:
        self._client.delete_object(Bucket=bucket, Key=key)


_storage: StorageService | None = None


def get_storage() -> StorageService:
    global _storage
    if _storage is None:
        _storage = StorageService()
        _storage.ensure_buckets()
    return _storage
