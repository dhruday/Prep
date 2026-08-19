"""Download validation: size, SHA-256, and optional ffprobe media inspection."""

from __future__ import annotations

import hashlib
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


class ValidationError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class ValidationResult:
    size: int
    sha256: str
    media_checked: bool


def sha256_file(path: Path, *, block_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(block_size), b""):
            digest.update(block)
    return digest.hexdigest()


def _ffprobe_valid(path: Path) -> bool:
    binary = shutil.which("ffprobe")
    if not binary:
        return True
    result = subprocess.run(
        [binary, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )
    return result.returncode == 0


def validate_file(path: Path, *, expected_size: int | None, video: bool = True) -> ValidationResult:
    if not path.is_file():
        raise ValidationError(f"Downloaded file does not exist: {path}")
    size = path.stat().st_size
    if size == 0:
        raise ValidationError("Downloaded file is empty")
    if expected_size is not None and size != expected_size:
        raise ValidationError(f"File size {size} does not match Telegram metadata ({expected_size})")
    media_checked = video and shutil.which("ffprobe") is not None
    if media_checked and not _ffprobe_valid(path):
        raise ValidationError("ffprobe could not read the completed media file")
    return ValidationResult(size=size, sha256=sha256_file(path), media_checked=media_checked)
