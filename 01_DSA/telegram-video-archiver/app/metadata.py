"""Typed metadata shared by discovery, planning, and downloading."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass, field
from datetime import datetime
from datetime import timezone
from pathlib import Path
from typing import Any


STATUSES = {
    "DISCOVERED",
    "PLANNED",
    "DOWNLOADING",
    "COMPLETED",
    "FAILED",
    "SKIPPED",
    "DUPLICATE",
}


@dataclass(slots=True)
class MediaItem:
    source_id: str
    message_id: int
    message_date: str | None
    original_filename: str | None
    caption: str | None
    media_type: str
    file_size: int | None
    mime_type: str | None
    duration: int | None
    width: int | None
    height: int | None
    message_url: str | None
    telegram_metadata: dict[str, Any] = field(default_factory=dict)
    lesson_number: int | None = None
    section: str | None = None
    title: str | None = None
    normalized_filename: str | None = None
    local_path: str | None = None
    status: str = "DISCOVERED"
    sha256: str | None = None
    attempts: int = 0
    downloaded_at: str | None = None
    last_error: str | None = None

    @property
    def identity(self) -> tuple[str, int]:
        return self.source_id, self.message_id

    @property
    def date(self) -> datetime | None:
        if not self.message_date:
            return None
        return datetime.fromisoformat(self.message_date.replace("Z", "+00:00"))

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_mapping(cls, payload: dict[str, Any]) -> "MediaItem":
        return cls(**payload)


def export_index(items: list[MediaItem], output_directory: Path, database_path: Path) -> dict[str, Any]:
    """Write the portable metadata index and a consistent SQLite backup to the archive."""
    metadata_directory = output_directory / "metadata"
    metadata_directory.mkdir(parents=True, exist_ok=True)
    completed = [item for item in items if item.status == "COMPLETED"]
    grouped: dict[str, list[MediaItem]] = {}
    for item in completed:
        grouped.setdefault(item.section or "Uncategorized", []).append(item)
    sections = []
    for name in sorted(grouped, key=str.casefold):
        sections.append(
            {
                "name": name,
                "items": [
                    {
                        "lesson_number": item.lesson_number,
                        "title": item.title,
                        "filename": item.normalized_filename,
                        "path": item.local_path,
                        "message_id": item.message_id,
                        "duration": item.duration,
                    }
                    for item in sorted(
                        grouped[name], key=lambda entry: (entry.local_path or "", entry.message_id)
                    )
                ],
            }
        )
    payload: dict[str, Any] = {
        "course": "Authorized Archive",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_items": len(items),
        "completed": len(completed),
        "failed": sum(item.status == "FAILED" for item in items),
        "sections": sections,
    }
    content = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    (metadata_directory / "index.json").write_text(content, encoding="utf-8")
    (metadata_directory / "summary.json").write_text(
        json.dumps(
            {
                "generated_at": payload["generated_at"],
                "total_items": payload["total_items"],
                "completed": payload["completed"],
                "failed": payload["failed"],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    # sqlite's backup API avoids copying a database while it could be in a transaction.
    if database_path.exists():
        source = sqlite3.connect(database_path)
        destination = sqlite3.connect(metadata_directory / "archive.db")
        try:
            source.backup(destination)
        finally:
            destination.close()
            source.close()
    return payload
