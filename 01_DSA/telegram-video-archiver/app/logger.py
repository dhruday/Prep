"""Structured application and failure logging."""

from __future__ import annotations

import json
import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def configure_logging(log_directory: Path, verbose: bool = False) -> logging.Logger:
    log_directory.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("telegram_video_archiver")
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    if logger.handlers:
        return logger
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    app_handler = logging.FileHandler(log_directory / "app.log", encoding="utf-8")
    app_handler.setLevel(logging.DEBUG)
    app_handler.setFormatter(formatter)
    error_handler = logging.FileHandler(log_directory / "errors.log", encoding="utf-8")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.DEBUG if verbose else logging.INFO)
    stream_handler.setFormatter(formatter)
    logger.addHandler(app_handler)
    logger.addHandler(error_handler)
    logger.addHandler(stream_handler)
    return logger


def record_failure(log_directory: Path, *, item: Any, error: Exception, attempt: int) -> None:
    """Append a machine-readable failure record without serializing credentials."""
    target = log_directory / "failed-downloads.json"
    try:
        current = json.loads(target.read_text(encoding="utf-8")) if target.exists() else []
    except json.JSONDecodeError:
        current = []
    current.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message_id": item.message_id,
            "source_id": item.source_id,
            "filename": item.normalized_filename or item.original_filename,
            "attempt": attempt,
            "exception": type(error).__name__,
            "error": str(error),
            "traceback": "".join(traceback.format_exception(type(error), error, error.__traceback__)),
        }
    )
    target.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
