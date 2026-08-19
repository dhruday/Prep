"""Read authorized Telegram messages and persist media metadata without downloading."""

from __future__ import annotations

from datetime import timezone
from pathlib import Path
from typing import Any, AsyncIterator

from .metadata import MediaItem


def _document_attributes(document: Any) -> tuple[str | None, int | None, int | None, int | None]:
    filename: str | None = None
    duration: int | None = None
    width: int | None = None
    height: int | None = None
    for attribute in getattr(document, "attributes", []) or []:
        if hasattr(attribute, "file_name"):
            filename = attribute.file_name
        if hasattr(attribute, "duration"):
            duration = int(attribute.duration)
        if hasattr(attribute, "w"):
            width = int(attribute.w)
        if hasattr(attribute, "h"):
            height = int(attribute.h)
    return filename, duration, width, height


def message_to_media_item(message: Any, source_id: str, source_reference: str | None = None) -> MediaItem | None:
    """Extract safe metadata from one Telethon message.

    Access hashes, file references, and session information are excluded deliberately:
    those are neither useful archive metadata nor appropriate persistent credentials.
    """
    document = getattr(getattr(message, "media", None), "document", None)
    photo = getattr(getattr(message, "media", None), "photo", None)
    if not document and not photo:
        return None
    if document:
        filename, duration, width, height = _document_attributes(document)
        mime = getattr(document, "mime_type", None)
        is_video = bool(mime and mime.startswith("video/")) or any(
            hasattr(attribute, "w") and hasattr(attribute, "h") for attribute in getattr(document, "attributes", []) or []
        )
        media_type = "video" if is_video else "document"
        file_size = int(getattr(document, "size", 0) or 0) or None
        metadata = {
            "document_id": str(getattr(document, "id", "")),
            "mime_type": mime,
            "attributes": [type(attribute).__name__ for attribute in getattr(document, "attributes", []) or []],
        }
    else:
        filename, duration, width, height = None, None, getattr(photo, "w", None), getattr(photo, "h", None)
        mime, media_type, file_size = "image/jpeg", "photo", None
        metadata = {"photo_id": str(getattr(photo, "id", ""))}

    date = getattr(message, "date", None)
    date_text = date.astimezone(timezone.utc).isoformat() if date else None
    public_url = None
    if source_reference and source_reference.lstrip("@").replace("_", "").isalnum():
        public_url = f"https://t.me/{source_reference.lstrip('@')}/{message.id}"
    return MediaItem(
        source_id=source_id,
        message_id=int(message.id),
        message_date=date_text,
        original_filename=filename,
        caption=getattr(message, "message", None),
        media_type=media_type,
        file_size=file_size,
        mime_type=mime,
        duration=duration,
        width=width,
        height=height,
        message_url=public_url,
        telegram_metadata=metadata,
    )


async def discover(gateway: Any, manifest: Any, *, limit: int | None = None, from_message: int | None = None, to_message: int | None = None) -> int:
    """Persist all reachable media records. This function never requests file bytes."""
    count = 0
    async for message in gateway.iter_messages(limit=limit, from_message=from_message, to_message=to_message):
        item = message_to_media_item(message, gateway.source_id, getattr(gateway, "public_source", None))
        if item is None:
            continue
        manifest.upsert_discovered(item)
        count += 1
    return count
