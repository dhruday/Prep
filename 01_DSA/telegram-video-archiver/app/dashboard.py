"""Local, read-only progress dashboard for a running archive."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .config import Settings
from .manifest import Manifest

_PROGRESS = re.compile(
    r"^(?P<timestamp>\S+) \S+ .*progress message_id=(?P<message_id>\d+) "
    r"percent=(?P<percent>\d+) bytes=(?P<received>\d+)/(?P<total>\d+)"
)


def _tail(path: Path, maximum_bytes: int = 512 * 1024) -> list[str]:
    if not path.exists():
        return []
    with path.open("rb") as stream:
        stream.seek(0, 2)
        start = max(0, stream.tell() - maximum_bytes)
        stream.seek(start)
        content = stream.read().decode("utf-8", errors="replace")
    return content.splitlines()


def _progress_samples(log_path: Path) -> dict[int, list[tuple[datetime, int, int]]]:
    """Read recent progress snapshots without retaining a growing history in memory."""
    samples: dict[int, list[tuple[datetime, int, int]]] = defaultdict(list)
    for line in _tail(log_path):
        match = _PROGRESS.match(line)
        if not match:
            continue
        try:
            timestamp = datetime.fromisoformat(match.group("timestamp"))
        except ValueError:
            continue
        samples[int(match.group("message_id"))].append(
            (timestamp, int(match.group("received")), int(match.group("total")))
        )
    return samples


def _rate(samples: list[tuple[datetime, int, int]]) -> float:
    if len(samples) < 2:
        return 0.0
    first, last = samples[-2], samples[-1]
    elapsed = (last[0] - first[0]).total_seconds()
    return max(0.0, (last[1] - first[1]) / elapsed) if elapsed > 0 else 0.0


class Dashboard:
    def __init__(self, settings: Settings, manifest: Manifest) -> None:
        self.settings = settings
        self.manifest = manifest

    def payload(self) -> dict[str, Any]:
        items = self.manifest.list_items()
        videos = [item for item in items if item.media_type == "video"]
        completed = [item for item in videos if item.status == "COMPLETED"]
        active = [item for item in videos if item.status == "DOWNLOADING"]
        pending = [
            item
            for item in videos
            if item.status in {"DISCOVERED", "PLANNED", "DOWNLOADING", "FAILED"}
        ]
        samples = _progress_samples(self.settings.log_directory / "app.log")
        completed_bytes = sum(item.file_size or 0 for item in completed)
        current: list[dict[str, Any]] = []
        active_bytes = 0
        aggregate_rate = 0.0
        for item in active:
            snapshots = samples.get(item.message_id, [])
            received = snapshots[-1][1] if snapshots else 0
            expected = item.file_size or (snapshots[-1][2] if snapshots else 0)
            received = min(received, expected) if expected else received
            active_bytes += received
            rate = _rate(snapshots)
            aggregate_rate += rate
            current.append(
                {
                    "messageId": item.message_id,
                    "filename": item.normalized_filename or item.original_filename or "Untitled",
                    "receivedBytes": received,
                    "totalBytes": expected,
                    "percent": round((received / expected * 100) if expected else 0, 1),
                    "rateBytesPerSecond": rate,
                }
            )
        total_bytes = sum(item.file_size or 0 for item in videos)
        received_bytes = min(total_bytes, completed_bytes + active_bytes)
        remaining_bytes = max(0, total_bytes - received_bytes)
        eta_seconds = (remaining_bytes / aggregate_rate) if aggregate_rate > 0 else None
        failures = [
            {
                "messageId": item.message_id,
                "filename": item.normalized_filename or item.original_filename or "Untitled",
                "error": item.last_error,
            }
            for item in videos
            if item.status == "FAILED"
        ]
        return {
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "totalVideos": len(videos),
            "completed": len(completed),
            "pending": len(pending),
            "duplicates": sum(item.status == "DUPLICATE" for item in videos),
            "unknownMedia": len(items) - len(videos),
            "totalBytes": total_bytes,
            "receivedBytes": received_bytes,
            "remainingBytes": remaining_bytes,
            "percent": round((received_bytes / total_bytes * 100) if total_bytes else 0, 2),
            "rateBytesPerSecond": aggregate_rate,
            "etaSeconds": eta_seconds,
            "current": current,
            "failures": failures[-10:],
            "archivePath": str(self.settings.output_directory),
        }


def _handler(dashboard: Dashboard) -> type[BaseHTTPRequestHandler]:
    html_path = Path(__file__).with_name("dashboard.html")

    class DashboardHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - HTTP API naming
            route = urlparse(self.path).path
            if route == "/api/status":
                content = json.dumps(dashboard.payload(), ensure_ascii=False).encode("utf-8")
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            if route in {"/", "/index.html"}:
                content = html_path.read_bytes()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            self.send_error(HTTPStatus.NOT_FOUND)

        def log_message(self, format: str, *args: object) -> None:
            # The dashboard is polled often; avoid polluting application logs.
            return

    return DashboardHandler


def serve_dashboard(settings: Settings, manifest: Manifest, host: str, port: int) -> None:
    """Serve only on loopback by default; it exposes no control or credentials."""
    server = ThreadingHTTPServer((host, port), _handler(Dashboard(settings, manifest)))
    print(f"Dashboard available at http://{host}:{port}")
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
