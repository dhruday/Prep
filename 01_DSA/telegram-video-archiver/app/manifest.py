"""SQLite-backed persistent manifest.

The manifest is the source of truth for resumability.  It contains public media
metadata, but intentionally never contains Telegram credentials or session data.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Sequence

from .metadata import MediaItem, STATUSES


SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS items (
    source_id TEXT NOT NULL,
    message_id INTEGER NOT NULL,
    message_date TEXT,
    original_filename TEXT,
    normalized_filename TEXT,
    caption TEXT,
    media_type TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    duration INTEGER,
    width INTEGER,
    height INTEGER,
    message_url TEXT,
    telegram_metadata TEXT NOT NULL DEFAULT '{}',
    lesson_number INTEGER,
    section TEXT,
    title TEXT,
    local_path TEXT,
    sha256 TEXT,
    status TEXT NOT NULL CHECK(status IN ('DISCOVERED','PLANNED','DOWNLOADING','COMPLETED','FAILED','SKIPPED','DUPLICATE')),
    attempts INTEGER NOT NULL DEFAULT 0,
    downloaded_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (source_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_sha256 ON items(sha256);
CREATE INDEX IF NOT EXISTS idx_items_telegram_document ON items(source_id, message_id);
CREATE TABLE IF NOT EXISTS duplicates (
    source_id TEXT NOT NULL,
    message_id INTEGER NOT NULL,
    canonical_source_id TEXT NOT NULL,
    canonical_message_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (source_id, message_id),
    FOREIGN KEY (source_id, message_id) REFERENCES items(source_id, message_id),
    FOREIGN KEY (canonical_source_id, canonical_message_id) REFERENCES items(source_id, message_id)
);
"""


class Manifest:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        con = sqlite3.connect(self.database_path)
        con.row_factory = sqlite3.Row
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    def initialize(self) -> None:
        with self.connection() as con:
            con.executescript(SCHEMA)

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _from_row(row: sqlite3.Row) -> MediaItem:
        payload = dict(row)
        payload.pop("created_at", None)
        payload.pop("updated_at", None)
        payload["telegram_metadata"] = json.loads(payload["telegram_metadata"] or "{}")
        return MediaItem.from_mapping(payload)

    def upsert_discovered(self, item: MediaItem) -> None:
        """Refresh remote metadata without downgrading a completed local record."""
        now = self._now()
        values = item.as_dict()
        values["telegram_metadata"] = json.dumps(values["telegram_metadata"], ensure_ascii=False, sort_keys=True)
        values.update(created_at=now, updated_at=now)
        columns = ", ".join(values)
        placeholders = ", ".join(f":{key}" for key in values)
        updates = ", ".join(
            f"{key}=excluded.{key}"
            for key in values
            if key not in {"source_id", "message_id", "created_at", "status", "local_path", "sha256", "attempts", "downloaded_at", "last_error"}
        )
        with self.connection() as con:
            con.execute(
                f"""
                INSERT INTO items ({columns}) VALUES ({placeholders})
                ON CONFLICT(source_id, message_id) DO UPDATE SET {updates}, updated_at=excluded.updated_at
                """,
                values,
            )

    def get(self, source_id: str, message_id: int) -> MediaItem | None:
        with self.connection() as con:
            row = con.execute(
                "SELECT * FROM items WHERE source_id=? AND message_id=?", (source_id, message_id)
            ).fetchone()
        return self._from_row(row) if row else None

    def list_items(
        self,
        *,
        statuses: Sequence[str] | None = None,
        section: str | None = None,
        limit: int | None = None,
        from_message: int | None = None,
        to_message: int | None = None,
    ) -> list[MediaItem]:
        clauses: list[str] = []
        parameters: list[object] = []
        if statuses:
            clauses.append("status IN (" + ",".join("?" for _ in statuses) + ")")
            parameters.extend(statuses)
        if section:
            clauses.append("section = ?")
            parameters.append(section)
        if from_message is not None:
            clauses.append("message_id >= ?")
            parameters.append(from_message)
        if to_message is not None:
            clauses.append("message_id <= ?")
            parameters.append(to_message)
        query = "SELECT * FROM items" + (" WHERE " + " AND ".join(clauses) if clauses else "")
        query += " ORDER BY source_id, message_id"
        if limit is not None:
            query += " LIMIT ?"
            parameters.append(limit)
        with self.connection() as con:
            rows = con.execute(query, parameters).fetchall()
        return [self._from_row(row) for row in rows]

    def update_plan(self, item: MediaItem) -> None:
        if not item.local_path or not item.normalized_filename:
            raise ValueError("A planned item requires both local_path and normalized_filename")
        with self.connection() as con:
            con.execute(
                """
                UPDATE items SET section=?, lesson_number=?, title=?, normalized_filename=?, local_path=?,
                  status=CASE WHEN status IN ('COMPLETED','DUPLICATE','SKIPPED') THEN status ELSE 'PLANNED' END,
                  updated_at=? WHERE source_id=? AND message_id=?
                """,
                (item.section, item.lesson_number, item.title, item.normalized_filename, item.local_path,
                 self._now(), item.source_id, item.message_id),
            )

    def mark_downloading(self, item: MediaItem) -> int:
        with self.connection() as con:
            con.execute(
                "UPDATE items SET status='DOWNLOADING', attempts=attempts+1, last_error=NULL, updated_at=? WHERE source_id=? AND message_id=?",
                (self._now(), item.source_id, item.message_id),
            )
            row = con.execute(
                "SELECT attempts FROM items WHERE source_id=? AND message_id=?", item.identity
            ).fetchone()
        return int(row["attempts"])

    def mark_completed(self, item: MediaItem, *, sha256: str, local_path: str) -> None:
        with self.connection() as con:
            con.execute(
                """
                UPDATE items SET status='COMPLETED', sha256=?, local_path=?, downloaded_at=?, last_error=NULL,
                  updated_at=? WHERE source_id=? AND message_id=?
                """,
                (sha256, local_path, self._now(), self._now(), item.source_id, item.message_id),
            )

    def mark_failed(self, item: MediaItem, error: str) -> None:
        with self.connection() as con:
            con.execute(
                "UPDATE items SET status='FAILED', last_error=?, updated_at=? WHERE source_id=? AND message_id=?",
                (error, self._now(), item.source_id, item.message_id),
            )

    def mark_skipped(self, item: MediaItem, reason: str) -> None:
        with self.connection() as con:
            con.execute(
                "UPDATE items SET status='SKIPPED', last_error=?, updated_at=? WHERE source_id=? AND message_id=?",
                (reason, self._now(), item.source_id, item.message_id),
            )

    def mark_duplicate(self, item: MediaItem, canonical: MediaItem, reason: str) -> None:
        with self.connection() as con:
            con.execute(
                """
                UPDATE items SET status='DUPLICATE', local_path=?, sha256=?, last_error=NULL, updated_at=?
                WHERE source_id=? AND message_id=?
                """,
                (canonical.local_path, canonical.sha256, self._now(), item.source_id, item.message_id),
            )
            con.execute(
                """
                INSERT INTO duplicates(source_id,message_id,canonical_source_id,canonical_message_id,reason,created_at)
                VALUES(?,?,?,?,?,?) ON CONFLICT(source_id,message_id) DO UPDATE SET
                    canonical_source_id=excluded.canonical_source_id,
                    canonical_message_id=excluded.canonical_message_id,
                    reason=excluded.reason,
                    created_at=excluded.created_at
                """,
                (item.source_id, item.message_id, canonical.source_id, canonical.message_id, reason, self._now()),
            )

    def completed_by_sha256(self, sha256: str, *, exclude: tuple[str, int] | None = None) -> MediaItem | None:
        query = "SELECT * FROM items WHERE status='COMPLETED' AND sha256=?"
        params: list[object] = [sha256]
        if exclude:
            query += " AND NOT (source_id=? AND message_id=?)"
            params.extend(exclude)
        query += " ORDER BY downloaded_at, source_id, message_id LIMIT 1"
        with self.connection() as con:
            row = con.execute(query, params).fetchone()
        return self._from_row(row) if row else None

    def completed_by_document_id(self, document_id: str, *, exclude: tuple[str, int] | None = None) -> MediaItem | None:
        # JSON extraction is available in modern bundled SQLite. Fall back to a narrow text match.
        query = "SELECT * FROM items WHERE status='COMPLETED' AND json_extract(telegram_metadata, '$.document_id')=?"
        params: list[object] = [document_id]
        if exclude:
            query += " AND NOT (source_id=? AND message_id=?)"
            params.extend(exclude)
        query += " ORDER BY downloaded_at, source_id, message_id LIMIT 1"
        try:
            with self.connection() as con:
                row = con.execute(query, params).fetchone()
        except sqlite3.OperationalError:
            return None
        return self._from_row(row) if row else None

    def summary(self) -> dict[str, int]:
        with self.connection() as con:
            rows = con.execute("SELECT status, COUNT(*) AS count FROM items GROUP BY status").fetchall()
            total_size = con.execute("SELECT COALESCE(SUM(file_size), 0) AS total FROM items").fetchone()["total"]
        counts = {str(row["status"]): int(row["count"]) for row in rows}
        counts.update(total=sum(counts.values()), total_size=int(total_size or 0))
        return counts
