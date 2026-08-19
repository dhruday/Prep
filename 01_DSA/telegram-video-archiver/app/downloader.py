"""Safe, resumable download engine for already-authorized Telegram media."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .config import Settings
from .logger import record_failure
from .manifest import Manifest
from .metadata import MediaItem
from .organizer import Organizer
from .validator import ValidationError, validate_file


class DownloadSafetyError(RuntimeError):
    """An existing archive artifact makes overwriting unsafe."""


class DownloadEngine:
    def __init__(self, settings: Settings, manifest: Manifest, logger: logging.Logger) -> None:
        self.settings = settings
        self.manifest = manifest
        self.logger = logger

    @staticmethod
    def _part_path(final_path: Path) -> Path:
        return final_path.with_name(final_path.name + ".part")

    def _record_event(self, item: MediaItem, event: str, **extra: object) -> None:
        target = self.settings.project_root / "data" / "download-log.json"
        try:
            payload = json.loads(target.read_text(encoding="utf-8")) if target.exists() else []
        except json.JSONDecodeError:
            payload = []
        payload.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event": event,
                "source_id": item.source_id,
                "message_id": item.message_id,
                **extra,
            }
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    async def download_items(self, gateway: Any, items: Iterable[MediaItem], *, workers: int) -> dict[str, int]:
        semaphore = asyncio.Semaphore(workers)
        results = {"completed": 0, "duplicate": 0, "failed": 0, "skipped": 0}

        async def run(item: MediaItem) -> None:
            async with semaphore:
                outcome = await self.download_one(gateway, item)
                results[outcome] = results.get(outcome, 0) + 1

        await asyncio.gather(*(run(item) for item in items))
        return results

    async def download_one(self, gateway: Any, item: MediaItem) -> str:
        if item.media_type != "video":
            self.manifest.mark_skipped(item, f"Media type {item.media_type!r} is not a video")
            self._record_event(item, "skipped", reason="not-video")
            return "skipped"
        if item.file_size and item.file_size < self.settings.min_video_size_bytes:
            self.manifest.mark_skipped(item, "Below MIN_VIDEO_SIZE_MB")
            self._record_event(item, "skipped", reason="below-min-size")
            return "skipped"
        if self.settings.max_file_size_bytes and item.file_size and item.file_size > self.settings.max_file_size_bytes:
            self.manifest.mark_skipped(item, "Above MAX_FILE_SIZE_GB")
            self._record_event(item, "skipped", reason="above-max-size")
            return "skipped"

        document_id = str(item.telegram_metadata.get("document_id", ""))
        if document_id:
            canonical = self.manifest.completed_by_document_id(document_id, exclude=item.identity)
            if canonical:
                self.manifest.mark_duplicate(item, canonical, "same Telegram document id")
                self._record_event(item, "duplicate", canonical_message_id=canonical.message_id)
                return "duplicate"

        try:
            for retry_index in range(1, self.settings.download_retries + 1):
                attempt = self.manifest.mark_downloading(item)
                try:
                    return await self._download_attempt(gateway, item)
                except KeyboardInterrupt:
                    raise
                except Exception as error:
                    self.logger.warning(
                        "download attempt failed message_id=%s attempt=%s/%s error=%s",
                        item.message_id,
                        retry_index,
                        self.settings.download_retries,
                        error,
                    )
                    if retry_index == self.settings.download_retries:
                        self.manifest.mark_failed(item, str(error))
                        self.logger.error(
                            "download permanently failed message_id=%s attempts=%s",
                            item.message_id,
                            attempt,
                            exc_info=error,
                        )
                        record_failure(self.settings.log_directory, item=item, error=error, attempt=attempt)
                        self._record_event(item, "failed", error=str(error), attempt=attempt)
                        return "failed"
                    await asyncio.sleep(self.settings.retry_delay * (2 ** (retry_index - 1)))
        except KeyboardInterrupt:
            self.logger.info("download interrupted; partial .part files can be resumed safely")
            raise
        raise AssertionError("unreachable")

    async def _download_attempt(self, gateway: Any, item: MediaItem) -> str:
        final_path = Organizer.target_path(self.settings.output_directory, item)
        part_path = self._part_path(final_path)
        final_path.parent.mkdir(parents=True, exist_ok=True)

        if final_path.exists():
            try:
                result = validate_file(final_path, expected_size=item.file_size, video=True)
            except ValidationError as error:
                raise DownloadSafetyError(
                    f"Existing final file failed validation and will not be overwritten: {final_path} ({error})"
                ) from error
            canonical = self.manifest.completed_by_sha256(result.sha256, exclude=item.identity)
            if canonical:
                self.manifest.mark_duplicate(item, canonical, "same SHA-256 as existing archive file")
                return "duplicate"
            self.manifest.mark_completed(item, sha256=result.sha256, local_path=item.local_path or "")
            self._record_event(item, "already-complete", sha256=result.sha256)
            return "completed"

        offset = part_path.stat().st_size if part_path.exists() else 0
        if item.file_size is not None and offset > item.file_size:
            raise DownloadSafetyError(
                f"Partial file is larger than Telegram metadata; inspect it manually: {part_path}"
            )
        message = await gateway.get_message(item.message_id)
        document = getattr(getattr(message, "media", None), "document", None) if message else None
        if document is None:
            raise FileNotFoundError("The authorized source no longer exposes this video message")

        self.logger.info("downloading message_id=%s target=%s resumed_bytes=%s", item.message_id, final_path, offset)
        bytes_written = offset
        reported_percent = int((bytes_written / item.file_size) * 100) if item.file_size else -1
        with part_path.open("ab") as stream:
            async for chunk in gateway.iter_download(document, offset=offset, chunk_size=self.settings.chunk_size):
                if not chunk:
                    continue
                stream.write(chunk)
                bytes_written += len(chunk)
                if item.file_size and bytes_written > item.file_size:
                    raise ValidationError("Received more bytes than Telegram metadata declares")
                if item.file_size:
                    percent = int((bytes_written / item.file_size) * 100)
                    if percent >= min(100, reported_percent + 5):
                        self.logger.info(
                            "progress message_id=%s percent=%s bytes=%s/%s",
                            item.message_id,
                            percent,
                            bytes_written,
                            item.file_size,
                        )
                        reported_percent = percent
        result = validate_file(part_path, expected_size=item.file_size, video=True)
        canonical = self.manifest.completed_by_sha256(result.sha256, exclude=item.identity)
        if canonical:
            # This is a tool-created temporary artifact that passed validation. Remove it before
            # it becomes a second physical archive file; the manifest retains both references.
            part_path.unlink()
            self.manifest.mark_duplicate(item, canonical, "same SHA-256")
            self._record_event(item, "duplicate", canonical_message_id=canonical.message_id)
            return "duplicate"
        # ``os.replace`` is atomic within a volume. A final path was verified absent above; no
        # existing valid file is ever overwritten by this application.
        if final_path.exists():
            raise DownloadSafetyError(f"Target appeared while downloading; refusing overwrite: {final_path}")
        os.replace(part_path, final_path)
        self.manifest.mark_completed(item, sha256=result.sha256, local_path=item.local_path or "")
        self._record_event(item, "completed", bytes=result.size, sha256=result.sha256)
        self.logger.info("completed message_id=%s bytes=%s", item.message_id, result.size)
        return "completed"
