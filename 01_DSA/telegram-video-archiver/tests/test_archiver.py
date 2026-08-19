from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from app.classifier import SectionClassifier, ordering_key
from app.discovery import message_to_media_item
from app.dashboard import Dashboard
from app.config import Settings
from app.filename_cleaner import clean_title, collision_safe_name, extract_lesson_number, normalized_filename
from app.manifest import Manifest
from app.metadata import MediaItem
from app.organizer import Organizer
from app.validator import ValidationError, validate_file


def item(
    message_id: int,
    *,
    name: str = "Lecture 01 - Intro.mp4",
    caption: str | None = None,
    status: str = "DISCOVERED",
    section: str | None = None,
    local_path: str | None = None,
) -> MediaItem:
    return MediaItem(
        source_id="42",
        message_id=message_id,
        message_date="2026-01-01T00:00:00+00:00",
        original_filename=name,
        caption=caption,
        media_type="video",
        file_size=4,
        mime_type="video/mp4",
        duration=10,
        width=1280,
        height=720,
        message_url=None,
        telegram_metadata={"document_id": str(message_id)},
        status=status,
        section=section,
        local_path=local_path,
    )


class FilenameTests(unittest.TestCase):
    def test_normalizes_common_upload_names(self) -> None:
        self.assertEqual(normalized_filename("Lecture 01 - Intro!!!.mp4", lesson_number=1), "01 - Intro.mp4")
        self.assertEqual(normalized_filename("01_Intro_to_DSA_FINAL.mp4", lesson_number=1), "01 - Intro to DSA.mp4")
        self.assertEqual(normalized_filename("01. Introduction.mp4", lesson_number=1), "01 - Introduction.mp4")

    def test_extracts_lesson_number_and_removes_emoji(self) -> None:
        self.assertEqual(extract_lesson_number("Part 007: Trees"), 7)
        self.assertEqual(clean_title("  🌳 Trees___Basics!!!  "), "Trees Basics")

    def test_collision_name_is_stable(self) -> None:
        occupied = {"01 - Intro.mp4"}
        self.assertEqual(
            collision_safe_name("01 - Intro.mp4", 99, occupied),
            "01 - Intro [message-99].mp4",
        )


class ClassifierAndOrderingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.classifier = SectionClassifier(
            {"sections": [{"name": "Graphs", "keywords": ["graph", "bfs"]}, {"name": "Arrays", "keywords": ["array"]}]}
        )

    def test_detects_section_from_caption(self) -> None:
        result = self.classifier.classify(item(5, name="upload.mp4", caption="Lesson 02: BFS graph traversal"))
        self.assertEqual(result.section, "Graphs")
        self.assertEqual(result.lesson_number, 2)

    def test_explicit_number_precedes_message_sequence(self) -> None:
        early = item(10, name="Lecture 02.mp4")
        later = item(50, name="Lecture 01.mp4")
        early.lesson_number = 2
        later.lesson_number = 1
        self.assertEqual([entry.message_id for entry in sorted([early, later], key=ordering_key)], [50, 10])

    def test_organizer_uses_section_then_stable_paths(self) -> None:
        organizer = Organizer(self.classifier)
        first = item(3, name="02 BFS.mp4", caption="graph")
        second = item(2, name="01 Intro.mp4", caption="graph")
        planned = organizer.plan([first, second])
        self.assertEqual([entry.normalized_filename for entry in planned], ["01 - Intro.mp4", "02 - BFS.mp4"])
        self.assertTrue(all(entry.local_path and entry.local_path.startswith("01 - Graphs") for entry in planned))


class DiscoveryTests(unittest.TestCase):
    def test_extracts_safe_metadata_from_mock_telegram_message(self) -> None:
        class FilenameAttribute:
            file_name = "01 - Arrays.mp4"

        class VideoAttribute:
            duration = 42
            w = 1920
            h = 1080

        class Document:
            id = 9001
            size = 1234
            mime_type = "video/mp4"
            attributes = [FilenameAttribute(), VideoAttribute()]

        class Media:
            document = Document()
            photo = None

        class Message:
            id = 17
            message = "Lesson 01: Arrays"
            media = Media()
            date = None

        discovered = message_to_media_item(Message(), "42", "@authorized_source")
        assert discovered
        self.assertEqual(discovered.media_type, "video")
        self.assertEqual(discovered.original_filename, "01 - Arrays.mp4")
        self.assertEqual(discovered.duration, 42)
        self.assertEqual(discovered.telegram_metadata, {
            "document_id": "9001",
            "mime_type": "video/mp4",
            "attributes": ["FilenameAttribute", "VideoAttribute"],
        })
        self.assertEqual(discovered.message_url, "https://t.me/authorized_source/17")


class ManifestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / "archive.db"
        self.manifest = Manifest(self.database)
        self.manifest.initialize()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_persists_and_restores_metadata(self) -> None:
        original = item(1, caption="intro")
        self.manifest.upsert_discovered(original)
        restored = self.manifest.get("42", 1)
        self.assertIsNotNone(restored)
        assert restored
        self.assertEqual(restored.caption, "intro")
        self.assertEqual(restored.telegram_metadata["document_id"], "1")

    def test_duplicate_references_canonical_file(self) -> None:
        canonical = item(1, local_path="01 - Graphs/01 - Intro.mp4")
        duplicate = item(2, local_path="01 - Graphs/02 - Intro.mp4")
        self.manifest.upsert_discovered(canonical)
        self.manifest.upsert_discovered(duplicate)
        self.manifest.mark_completed(canonical, sha256="a" * 64, local_path=canonical.local_path or "")
        self.manifest.mark_duplicate(duplicate, canonical, "same hash")
        saved = self.manifest.get("42", 2)
        assert saved
        self.assertEqual(saved.status, "DUPLICATE")
        self.assertEqual(saved.local_path, canonical.local_path)

    def test_resume_plan_preserves_existing_partial_path(self) -> None:
        partial = item(
            1,
            status="FAILED",
            section="Graphs",
            local_path="01 - Graphs/01 - Intro.mp4",
        )
        planned = Organizer(SectionClassifier({"sections": [{"name": "Graphs", "keywords": ["graph"]}]})).plan([partial])
        self.assertEqual(planned[0].local_path, partial.local_path)


class ValidationTests(unittest.TestCase):
    def test_rejects_invalid_expected_size(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "video.mp4"
            path.write_bytes(b"test")
            with self.assertRaises(ValidationError):
                validate_file(path, expected_size=5, video=False)

    def test_hashes_valid_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "video.mp4"
            path.write_bytes(b"test")
            result = validate_file(path, expected_size=4, video=False)
            self.assertEqual(result.size, 4)
            self.assertEqual(len(result.sha256), 64)


class DashboardTests(unittest.TestCase):
    def test_payload_reports_manifest_totals_without_a_live_transfer(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            settings = Settings(
                project_root=root,
                api_id=None,
                api_hash=None,
                session=str(root / "session"),
                source=None,
                output_directory=root / "downloads",
                database_path=root / "data" / "archive.db",
                sections_path=root / "sections.json",
                log_directory=root / "logs",
            )
            manifest = Manifest(settings.database_path)
            manifest.initialize()
            source = item(1)
            manifest.upsert_discovered(source)
            manifest.mark_completed(source, sha256="b" * 64, local_path="01 - Section/01 - Intro.mp4")
            payload = Dashboard(settings, manifest).payload()
            self.assertEqual(payload["totalVideos"], 1)
            self.assertEqual(payload["completed"], 1)
            self.assertEqual(payload["receivedBytes"], 4)
            self.assertEqual(payload["pending"], 0)


if __name__ == "__main__":
    unittest.main()
