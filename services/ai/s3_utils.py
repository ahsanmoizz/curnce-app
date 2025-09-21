import os
import io
import boto3


def s3_client():
    endpoint = os.getenv("S3_ENDPOINT")
    access_key = os.getenv("S3_ACCESS_KEY")
    secret_key = os.getenv("S3_SECRET_KEY")
    use_ssl = os.getenv("S3_USE_SSL", "false").lower() == "true"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        use_ssl=use_ssl,
    )


def download_to_bytes(bucket: str, key: str) -> bytes:
    cli = s3_client()
    buf = io.BytesIO()
    cli.download_fileobj(bucket, key, buf)
    return buf.getvalue()
