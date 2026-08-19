"""Planning of deterministic archive paths; this module does not move files."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import replace
from pathlib import Path
from typing import Iterable

from .classifier import SectionClassifier, ordering_key
from .filename_cleaner import clean_title, collision_safe_name, normalized_filename
from .metadata import MediaItem


class Organizer:
    def __init__(self, classifier: SectionClassifier) -> None:
        self.classifier = classifier

    def plan(self, items: Iterable[MediaItem]) -> list[MediaItem]:
        """Create stable, collision-safe paths for an entire discovered collection."""
        grouped: dict[str, list[MediaItem]] = defaultdict(list)
        frozen: list[MediaItem] = []
        directories: dict[str, Path] = {}
        occupied: dict[Path, set[str]] = defaultdict(set)
        for item in items:
            classification = self.classifier.classify(item)
            enriched = replace(
                item,
                section=item.section or classification.section,
                title=item.title or classification.title,
                lesson_number=item.lesson_number if item.lesson_number is not None else classification.lesson_number,
            )
            # A path attached to a prior plan may have a .part file; completed and duplicate
            # records definitely reference physical archive files. Keep both stable on re-plan.
            if enriched.local_path and enriched.status not in {"DISCOVERED"}:
                directory = Path(enriched.local_path).parent
                directories.setdefault(enriched.section or "Uncategorized", directory)
                occupied[directory].add(Path(enriched.local_path).name.casefold())
                frozen.append(enriched)
            else:
                grouped[enriched.section or "Uncategorized"].append(enriched)

        ordered_sections = sorted(grouped, key=lambda section: (self.classifier.section_index(section), section.casefold()))
        planned: list[MediaItem] = list(frozen)
        used_numbers = {
            int(directory.name.split(" - ", 1)[0])
            for directory in directories.values()
            if directory.name.split(" - ", 1)[0].isdigit()
        }
        for section in ordered_sections:
            directory_path = directories.get(section)
            if directory_path is None:
                section_number = self.classifier.section_index(section)
                while section_number in used_numbers:
                    section_number += 1
                used_numbers.add(section_number)
                directory_path = Path(f"{section_number:02d} - {clean_title(section, 'Uncategorized')}")
                directories[section] = directory_path
            for sequence, item in enumerate(sorted(grouped[section], key=ordering_key), start=1):
                number = item.lesson_number or sequence
                filename = normalized_filename(
                    item.original_filename,
                    title=item.title,
                    lesson_number=number,
                )
                filename = collision_safe_name(filename, item.message_id, occupied[directory_path])
                occupied[directory_path].add(filename.casefold())
                planned.append(
                    replace(
                        item,
                        normalized_filename=filename,
                        local_path=str(directory_path / filename),
                    )
                )
        return sorted(planned, key=lambda item: (item.local_path or "", item.message_id))

    @staticmethod
    def target_path(output_directory: Path, item: MediaItem) -> Path:
        if not item.local_path:
            raise ValueError(f"Item {item.message_id} has not been planned")
        candidate = (output_directory / item.local_path).resolve()
        output_root = output_directory.resolve()
        if output_root not in candidate.parents:
            raise ValueError("Refusing a planned path outside OUTPUT_DIRECTORY")
        return candidate
