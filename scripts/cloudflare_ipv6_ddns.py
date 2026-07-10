#!/usr/bin/env python3
"""Update a Cloudflare AAAA record to this machine's current public IPv6."""
from __future__ import annotations

import ipaddress
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


CF_API = "https://api.cloudflare.com/client/v4"
DEFAULT_IP_APIS = [
    "https://api64.ipify.org",
    "https://ifconfig.co/ip",
]


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None or value == "":
        raise SystemExit(f"Missing required env var: {name}")
    return value


def request_json(url: str, method: str = "GET", body: dict | None = None) -> dict:
    token = env("CF_API_TOKEN")
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            payload = json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Cloudflare API error {exc.code}: {detail}") from exc

    if not payload.get("success"):
        raise SystemExit(f"Cloudflare API failed: {payload}")
    return payload


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "stock-dashboard-ddns/1.0"})
    with urllib.request.urlopen(req, timeout=15) as res:
        return res.read().decode("utf-8").strip()


def current_ipv6() -> str:
    urls = [os.environ["IPV6_LOOKUP_URL"]] if os.environ.get("IPV6_LOOKUP_URL") else DEFAULT_IP_APIS
    last_error: Exception | None = None
    for url in urls:
        try:
            ip = ipaddress.ip_address(fetch_text(url))
            if ip.version != 6:
                raise ValueError(f"{url} returned non-IPv6 address: {ip}")
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
                raise ValueError(f"{url} returned non-public IPv6 address: {ip}")
            return str(ip)
        except Exception as exc:
            last_error = exc
    raise SystemExit(f"Could not detect public IPv6: {last_error}")


def find_record(zone_id: str, name: str) -> dict | None:
    query = urllib.parse.urlencode({"type": "AAAA", "name": name})
    payload = request_json(f"{CF_API}/zones/{zone_id}/dns_records?{query}")
    records = payload.get("result", [])
    return records[0] if records else None


def main() -> int:
    zone_id = env("CF_ZONE_ID")
    name = env("CF_RECORD_NAME")
    ttl = int(os.environ.get("CF_TTL", "120"))
    proxied = os.environ.get("CF_PROXIED", "false").lower() in {"1", "true", "yes"}
    ipv6 = current_ipv6()

    record_id = os.environ.get("CF_RECORD_ID")
    record = None if record_id else find_record(zone_id, name)
    if record:
        record_id = record["id"]
        if record.get("content") == ipv6 and bool(record.get("proxied")) == proxied:
            print(f"AAAA {name} already points to {ipv6}")
            return 0

    body = {
        "type": "AAAA",
        "name": name,
        "content": ipv6,
        "ttl": ttl,
        "proxied": proxied,
    }

    if record_id:
        request_json(f"{CF_API}/zones/{zone_id}/dns_records/{record_id}", "PUT", body)
        print(f"Updated AAAA {name} -> {ipv6}")
    else:
        request_json(f"{CF_API}/zones/{zone_id}/dns_records", "POST", body)
        print(f"Created AAAA {name} -> {ipv6}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
