"""
MCP tools for Dean Council quick-add flow.
"""
from __future__ import annotations

from typing import Optional

import httpx


def _build_headers(auth_token: Optional[str], cookie: Optional[str]) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    if cookie:
        headers["Cookie"] = cookie
    return headers


async def auto_divide_councils(
    api_base_url: str,
    call_round_id: str,
    min_projects_per_council: int = 5,
    max_projects_per_council: int = 10,
    clear_existing: bool = False,
    auth_token: Optional[str] = None,
    cookie: Optional[str] = None,
) -> dict:
    """
    Call dean auto-divide councils API and return generated councils.
    """
    endpoint = f"{api_base_url.rstrip('/')}/api/dean/call-rounds/{call_round_id}/councils"
    payload = {
        "minProjectsPerCouncil": min_projects_per_council,
        "maxProjectsPerCouncil": max_projects_per_council,
        "clearExisting": clear_existing,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                endpoint,
                json=payload,
                headers=_build_headers(auth_token=auth_token, cookie=cookie),
            )

        if response.status_code >= 400:
            return {
                "success": False,
                "status_code": response.status_code,
                "endpoint": endpoint,
                "payload": payload,
                "error": response.text,
            }

        data = response.json()
        return {
            "success": True,
            "status_code": response.status_code,
            "endpoint": endpoint,
            "payload": payload,
            "data": data,
        }
    except Exception as exc:
        return {
            "success": False,
            "status_code": 500,
            "endpoint": endpoint,
            "payload": payload,
            "error": str(exc),
        }


async def get_councils_by_call_round(
    api_base_url: str,
    call_round_id: str,
    auth_token: Optional[str] = None,
    cookie: Optional[str] = None,
) -> dict:
    """
    Fetch councils list for a call round.
    """
    endpoint = f"{api_base_url.rstrip('/')}/api/dean/call-rounds/{call_round_id}/councils"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                endpoint,
                headers=_build_headers(auth_token=auth_token, cookie=cookie),
            )

        if response.status_code >= 400:
            return {
                "success": False,
                "status_code": response.status_code,
                "endpoint": endpoint,
                "error": response.text,
            }

        data = response.json()
        return {
            "success": True,
            "status_code": response.status_code,
            "endpoint": endpoint,
            "data": data,
        }
    except Exception as exc:
        return {
            "success": False,
            "status_code": 500,
            "endpoint": endpoint,
            "error": str(exc),
        }