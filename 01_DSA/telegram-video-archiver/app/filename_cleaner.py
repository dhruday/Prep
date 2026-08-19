"""Filesystem-safe, deterministic filename and title handling."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

_ILLEGAL = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_EMOJI = re.compile("[\U00010000-\U0010ffff]", flags=re.UNICODE)
_SPACE = re.compile(r"\s+")
_SEPARATORS = re.compile(r"[._-]+")
_MEANINGLESS = re.compile(r"\b(?:final|full|hd|fhd|1080p|720p|video|lecture|lec)\b", re.I)
_NUMBER = re.compile(r"(?:^|\b)(?:lecture|lec|lesson|episode|ep|part)?\s*0*(\d{1,4})(?:\b|(?=[._-]))", re.I)
_PUNCTUATION = re.compile(r"[^\w\s&+'-]", re.UNICODE)


def split_extension(filename: str | None, fallback: str = ".mp4") -> tuple[str, str]:
    name = (filename or "").strip()
    suffix = Path(name).suffix.lower()
    if suffix and len(suffix) <= 10:
        return name[: -len(suffix)], suffix
    return name or "Untitled", fallback


def extract_lesson_number(*values: str | None) -> int | None:
    """Return the first explicit lecture/episode/leading numeric signal."""
    for value in values:
        if not value:
            continue
        match = _NUMBER.search(value)
        if match:
            return int(match.group(1))
    return None


def clean_title(value: str | None, fallback: str = "Untitled") -> str:
    """Normalize text without erasing meaningful course terminology."""
    text = unicodedata.normalize("NFKC", value or "")
    text = _EMOJI.sub(" ", text)
    text = _ILLEGAL.sub(" ", text)
    text = _PUNCTUATION.sub(" ", text)
    text = _SEPARATORS.sub(" ", text)
    text = _NUMBER.sub(" ", text, count=1)
    text = _MEANINGLESS.sub(" ", text)
    text = _SPACE.sub(" ", text).strip(" .-_")
    return text or fallback


def normalized_filename(
    original_filename: str | None,
    *,
    title: str | None = None,
    lesson_number: int | None = None,
    fallback_extension: str = ".mp4",
) -> str:
    """Produce a predictable filename, such as ``01 - Introduction.mp4``."""
    stem, extension = split_extension(original_filename, fallback_extension)
    clean = clean_title(title or stem)
    prefix = f"{lesson_number:02d} - " if lesson_number is not None else ""
    return f"{prefix}{clean}{extension}"


def collision_safe_name(filename: str, message_id: int, occupied: set[str]) -> str:
    """Make a collision explicit and stable instead of overwriting a file."""
    occupied_folded = {entry.casefold() for entry in occupied}
    if filename.casefold() not in occupied_folded:
        return filename
    path = Path(filename)
    candidate = f"{path.stem} [message-{message_id}]{path.suffix}"
    number = 2
    while candidate.casefold() in occupied_folded:
        candidate = f"{path.stem} [message-{message_id}-{number}]{path.suffix}"
        number += 1
    return candidate
