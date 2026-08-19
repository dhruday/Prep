"""Configurable, explainable section classification and deterministic ordering."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from .filename_cleaner import clean_title, extract_lesson_number, split_extension
from .metadata import MediaItem


@dataclass(frozen=True, slots=True)
class Classification:
    section: str
    title: str
    lesson_number: int | None
    reason: str


class SectionClassifier:
    """Classify from user-provided keywords; the course taxonomy is never hard-coded."""

    def __init__(self, section_config: dict[str, Any]) -> None:
        raw_sections = section_config.get("sections", [])
        self.sections: list[tuple[str, tuple[str, ...]]] = []
        for entry in raw_sections:
            if not isinstance(entry, dict) or not isinstance(entry.get("name"), str):
                continue
            keywords = [entry["name"], *entry.get("keywords", [])]
            self.sections.append((entry["name"].strip(), tuple(str(k).casefold() for k in keywords)))

    def classify(self, item: MediaItem) -> Classification:
        haystack = " ".join(filter(None, (item.caption, item.original_filename))).casefold()
        matched: list[tuple[int, int, str]] = []
        for index, (name, keywords) in enumerate(self.sections):
            score = sum(1 for keyword in keywords if keyword and keyword in haystack)
            if score:
                matched.append((score, -index, name))
        section = max(matched)[2] if matched else "Uncategorized"
        number = extract_lesson_number(item.original_filename, item.caption)
        stem, _ = split_extension(item.original_filename, fallback=".mp4")
        # Captions are often more descriptive than a raw uploaded filename.
        caption_first_line = next((line.strip() for line in (item.caption or "").splitlines() if line.strip()), "")
        # A one-word caption is commonly a section tag ("graphs"), not a lecture title.
        title_source = caption_first_line if len(caption_first_line.split()) > 1 else stem
        title = clean_title(title_source, fallback=f"Message {item.message_id}")
        return Classification(
            section=section,
            title=title,
            lesson_number=number,
            reason="configured keyword" if matched else "no configured keyword",
        )

    def section_index(self, name: str) -> int:
        for index, (candidate, _) in enumerate(self.sections, start=1):
            if candidate.casefold() == name.casefold():
                return index
        return len(self.sections) + 1


def ordering_key(item: MediaItem) -> tuple[int, int, datetime, int]:
    """Canonical order: explicit number, then message sequence, then date/id tie breaks."""
    date = item.date or datetime.min
    if item.lesson_number is not None:
        return (0, item.lesson_number, date, item.message_id)
    # A message id is Telegram's canonical per-chat sequence and wins over date.
    return (1, item.message_id, date, item.message_id)


def natural_section_key(name: str) -> tuple[int, str]:
    number = re.match(r"^(\d+)", name)
    return (int(number.group(1)) if number else 10**9, name.casefold())
