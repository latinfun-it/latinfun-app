import os
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend/.env to get EXPO_PUBLIC_BACKEND_URL (public URL)
load_dotenv(Path(__file__).parents[2] / "frontend" / ".env")

BACKEND_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or ""
).rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    assert BACKEND_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
    return BACKEND_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api_client, base_url):
    r = api_client.post(
        f"{base_url}/api/auth/login",
        json={"email": "admin@latinfun.it", "password": "admin123"},
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]
