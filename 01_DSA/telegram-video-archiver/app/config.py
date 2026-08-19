"""Configuration loading and validation.

Credentials are deliberately loaded only from the environment (optionally through
``python-dotenv``); no secret is ever written to the manifest or application logs.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - dependency error is reported by the CLI
    load_dotenv = None  # type: ignore[assignment]


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class ConfigurationError(ValueError):
    """Raised when required runtime configuration is missing or invalid."""


def _positive_int(name: str, default: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        value = int(raw)
    except ValueError as exc:
        raise ConfigurationError(f"{name} must be an integer, got {raw!r}") from exc
    if value <= 0:
        raise ConfigurationError(f"{name} must be greater than zero")
    return value


def _non_negative_float(name: str, default: float) -> float:
    raw = os.getenv(name, str(default))
    try:
        value = float(raw)
    except ValueError as exc:
        raise ConfigurationError(f"{name} must be numeric, got {raw!r}") from exc
    if value < 0:
        raise ConfigurationError(f"{name} cannot be negative")
    return value


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Settings:
    project_root: Path
    api_id: int | None
    api_hash: str | None
    session: str
    source: str | None
    output_directory: Path
    database_path: Path
    sections_path: Path
    log_directory: Path
    max_concurrent_downloads: int = 2
    download_retries: int = 3
    retry_delay: float = 2.0
    chunk_size: int = 512 * 1024
    min_video_size_mb: float = 0.0
    max_file_size_gb: float = 0.0
    dry_run: bool = False

    def require_telegram(self) -> None:
        missing = [
            name
            for name, value in {
                "TELEGRAM_API_ID": self.api_id,
                "TELEGRAM_API_HASH": self.api_hash,
                "TELEGRAM_SOURCE": self.source,
            }.items()
            if not value
        ]
        if missing:
            raise ConfigurationError(
                "Telegram access requires " + ", ".join(missing) + ". Set them in .env."
            )

    @property
    def min_video_size_bytes(self) -> int:
        return int(self.min_video_size_mb * 1024 * 1024)

    @property
    def max_file_size_bytes(self) -> int | None:
        return int(self.max_file_size_gb * 1024**3) if self.max_file_size_gb else None


def load_settings(project_root: Path | None = None) -> Settings:
    """Load settings from ``.env`` in the project directory and the environment."""
    root = (project_root or PROJECT_ROOT).resolve()
    if load_dotenv:
        load_dotenv(root / ".env", override=False)

    raw_api_id = os.getenv("TELEGRAM_API_ID")
    try:
        api_id = int(raw_api_id) if raw_api_id else None
    except ValueError as exc:
        raise ConfigurationError("TELEGRAM_API_ID must be an integer") from exc

    output_value = os.getenv("OUTPUT_DIRECTORY", str(root / "downloads"))
    output = Path(output_value).expanduser()
    if not output.is_absolute():
        output = root / output
    sections_value = os.getenv("SECTIONS_CONFIG", str(root / "sections.json"))
    sections = Path(sections_value).expanduser()
    if not sections.is_absolute():
        sections = root / sections
    session_value = Path(os.getenv("TELEGRAM_SESSION", str(root / "data" / "telegram-session"))).expanduser()
    if not session_value.is_absolute():
        session_value = root / session_value

    return Settings(
        project_root=root,
        api_id=api_id,
        api_hash=os.getenv("TELEGRAM_API_HASH"),
        session=str(session_value),
        source=os.getenv("TELEGRAM_SOURCE"),
        output_directory=output,
        database_path=root / "data" / "archive.db",
        sections_path=sections,
        log_directory=root / "logs",
        max_concurrent_downloads=_positive_int("MAX_CONCURRENT_DOWNLOADS", 2),
        download_retries=_positive_int("DOWNLOAD_RETRIES", 3),
        retry_delay=_non_negative_float("RETRY_DELAY", 2.0),
        chunk_size=_positive_int("CHUNK_SIZE", 512 * 1024),
        min_video_size_mb=_non_negative_float("MIN_VIDEO_SIZE_MB", 0.0),
        max_file_size_gb=_non_negative_float("MAX_FILE_SIZE_GB", 0.0),
        dry_run=_as_bool(os.getenv("DRY_RUN")),
    )


def load_sections(path: Path) -> dict[str, Any]:
    """Read the user-editable section configuration with a defensive default."""
    if not path.exists():
        return {"sections": []}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigurationError(f"Invalid sections configuration: {path}") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("sections", []), list):
        raise ConfigurationError("sections.json must contain a top-level 'sections' list")
    return payload
