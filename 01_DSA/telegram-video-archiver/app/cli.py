"""Command-line interface for authorized Telegram archive workflows."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Iterable

from .classifier import SectionClassifier
from .config import ConfigurationError, Settings, load_sections, load_settings
from .dashboard import serve_dashboard
from .discovery import discover
from .downloader import DownloadEngine
from .logger import configure_logging
from .manifest import Manifest
from .metadata import MediaItem, export_index
from .organizer import Organizer
from .telegram_client import TelegramGateway
from .validator import ValidationError, validate_file


def _add_filters(parser: argparse.ArgumentParser, *, workers: bool = False, retry: bool = False) -> None:
    parser.add_argument("--dry-run", action="store_true", help="Show the plan; do not contact Telegram for file bytes.")
    parser.add_argument("--section", help="Limit output/downloads to one inferred section.")
    parser.add_argument("--limit", type=int, help="Limit matching messages/items.")
    parser.add_argument("--from-message", type=int, help="Include message IDs at or above this value.")
    parser.add_argument("--to-message", type=int, help="Include message IDs at or below this value.")
    if workers:
        parser.add_argument("--workers", type=int, help="Concurrent downloads (default: MAX_CONCURRENT_DOWNLOADS).")
    if retry:
        parser.add_argument("--retry-failed", action="store_true", help="Include records that failed in a previous run.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="telegram-video-archiver",
        description="Download and organize only Telegram media the authenticated account is authorized to archive.",
    )
    parser.add_argument("--project-root", type=Path, help="Project root (defaults to this installed project).")
    parser.add_argument("--verbose", action="store_true", help="Print debug logging to the terminal.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    discover_parser = subparsers.add_parser("discover", help="Persist media metadata; never downloads files.")
    _add_filters(discover_parser)
    plan_parser = subparsers.add_parser("plan", help="Show and persist a deterministic download plan.")
    _add_filters(plan_parser)
    download_parser = subparsers.add_parser("download", help="Download planned videos safely.")
    _add_filters(download_parser, workers=True, retry=True)
    resume_parser = subparsers.add_parser("resume", help="Validate completed files and continue incomplete work.")
    _add_filters(resume_parser, workers=True, retry=True)
    status_parser = subparsers.add_parser("status", help="Show manifest totals and progress.")
    _add_filters(status_parser)
    validate_parser = subparsers.add_parser("validate", help="Revalidate completed local files.")
    _add_filters(validate_parser)
    export_parser = subparsers.add_parser("export", help="Generate archive metadata/index.json and a DB backup.")
    _add_filters(export_parser)
    dashboard_parser = subparsers.add_parser("dashboard", help="Serve a local live progress dashboard.")
    dashboard_parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: loopback only).")
    dashboard_parser.add_argument("--port", type=int, default=8765, help="Local HTTP port (default: 8765).")
    return parser


def _filtered_items(manifest: Manifest, args: argparse.Namespace, *, statuses: tuple[str, ...] | None = None) -> list[MediaItem]:
    return manifest.list_items(
        statuses=statuses,
        section=getattr(args, "section", None),
        limit=getattr(args, "limit", None),
        from_message=getattr(args, "from_message", None),
        to_message=getattr(args, "to_message", None),
    )


def plan_manifest(settings: Settings, manifest: Manifest) -> list[MediaItem]:
    """Plan all videos together, so section order and collision handling stay global."""
    videos = manifest.list_items(statuses=None)
    videos = [item for item in videos if item.media_type == "video"]
    organizer = Organizer(SectionClassifier(load_sections(settings.sections_path)))
    planned = organizer.plan(videos)
    for item in planned:
        manifest.update_plan(item)
    return planned


def _show_plan(items: Iterable[MediaItem], manifest: Manifest) -> None:
    items = list(items)
    summary = manifest.summary()
    videos = [item for item in items if item.media_type == "video"]
    unknown = [item for item in items if item.media_type != "video"]
    pending = sum(item.status in {"DISCOVERED", "PLANNED", "DOWNLOADING", "FAILED"} for item in videos)
    print(f"Total media items : {summary.get('total', 0)}")
    print(f"Videos            : {len(videos)}")
    print(f"Already downloaded: {summary.get('COMPLETED', 0)}")
    print(f"Pending downloads : {pending}")
    print(f"Duplicates        : {summary.get('DUPLICATE', 0)}")
    print(f"Unknown items     : {len(unknown)}")
    print("\nProposed archive paths:")
    for item in sorted(videos, key=lambda entry: (entry.local_path or "", entry.message_id)):
        print(f"  [{item.message_id}] {item.local_path or '(unplanned)'}")


def _format_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return "0 B"


def _status(manifest: Manifest) -> None:
    summary = manifest.summary()
    total = summary.get("total", 0)
    completed = summary.get("COMPLETED", 0)
    pending = sum(summary.get(name, 0) for name in ("DISCOVERED", "PLANNED", "DOWNLOADING"))
    percent = round((completed / total * 100) if total else 0)
    bar_width = 34
    filled = round(bar_width * percent / 100)
    print(f"Total items       : {total}")
    print(f"Completed         : {completed}")
    print(f"Pending           : {pending}")
    print(f"Failed            : {summary.get('FAILED', 0)}")
    print(f"Duplicates        : {summary.get('DUPLICATE', 0)}")
    print(f"Total size        : {_format_size(summary.get('total_size', 0))}")
    print(f"\nProgress:\n[{'#' * filled}{'-' * (bar_width - filled)}] {percent}%")
    active = manifest.list_items(statuses=("DOWNLOADING",), limit=1)
    if active:
        print(f"Current download  : [{active[0].message_id}] {active[0].normalized_filename or active[0].original_filename}")


async def _run_discover(settings: Settings, manifest: Manifest, args: argparse.Namespace) -> None:
    async with TelegramGateway(settings) as gateway:
        count = await discover(
            gateway,
            manifest,
            limit=args.limit,
            from_message=args.from_message,
            to_message=args.to_message,
        )
    print(f"Discovered or refreshed {count} media items. No files were downloaded.")


def _validate_completed(settings: Settings, manifest: Manifest, args: argparse.Namespace) -> tuple[int, int]:
    checked, failed = 0, 0
    for item in _filtered_items(manifest, args, statuses=("COMPLETED",)):
        checked += 1
        try:
            target = Organizer.target_path(settings.output_directory, item)
            result = validate_file(target, expected_size=item.file_size, video=item.media_type == "video")
            manifest.mark_completed(item, sha256=result.sha256, local_path=item.local_path or "")
        except (ValidationError, ValueError) as error:
            manifest.mark_failed(item, f"Validation failed: {error}")
            print(f"FAILED [{item.message_id}] {error}", file=sys.stderr)
            failed += 1
    return checked, failed


async def _run_download(settings: Settings, manifest: Manifest, args: argparse.Namespace, *, resume: bool) -> None:
    planned = plan_manifest(settings, manifest)
    if args.dry_run or settings.dry_run:
        _show_plan(_filtered_items(manifest, args), manifest)
        print("\nDry run: no files were downloaded.")
        return
    if resume:
        checked, invalid = _validate_completed(settings, manifest, args)
        print(f"Resume preflight: validated {checked} completed files; {invalid} need retry.")
    statuses = ["DISCOVERED", "PLANNED", "DOWNLOADING"]
    if resume or args.retry_failed:
        statuses.append("FAILED")
    candidates = _filtered_items(manifest, args, statuses=tuple(statuses))
    candidates = [item for item in candidates if item.media_type == "video" and item.local_path]
    if not candidates:
        print("No pending videos match the selected filters.")
        return
    workers = args.workers or settings.max_concurrent_downloads
    if workers <= 0:
        raise ConfigurationError("--workers must be greater than zero")
    async with TelegramGateway(settings) as gateway:
        results = await DownloadEngine(settings, manifest, configure_logging(settings.log_directory)).download_items(
            gateway, candidates, workers=workers
        )
    print("Download summary: " + ", ".join(f"{key}={value}" for key, value in results.items()))


def execute(args: argparse.Namespace) -> int:
    settings = load_settings(args.project_root)
    logger = configure_logging(settings.log_directory, args.verbose)
    manifest = Manifest(settings.database_path)
    manifest.initialize()
    command = args.command
    if command == "discover":
        asyncio.run(_run_discover(settings, manifest, args))
    elif command == "plan":
        plan_manifest(settings, manifest)
        _show_plan(_filtered_items(manifest, args), manifest)
        print("\nPlan saved to the manifest. No files were downloaded.")
    elif command == "download":
        asyncio.run(_run_download(settings, manifest, args, resume=False))
    elif command == "resume":
        asyncio.run(_run_download(settings, manifest, args, resume=True))
    elif command == "status":
        _status(manifest)
    elif command == "validate":
        checked, failed = _validate_completed(settings, manifest, args)
        print(f"Validated {checked} completed files; {failed} failed validation.")
        return 1 if failed else 0
    elif command == "export":
        payload = export_index(manifest.list_items(), settings.output_directory, settings.database_path)
        # Retain a convenient project-local copy while the archive has the canonical portable copy.
        index_path = settings.project_root / "data" / "index.json"
        index_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Exported {payload['completed']} completed items to {settings.output_directory / 'metadata'}")
    elif command == "dashboard":
        if args.port < 1 or args.port > 65535:
            raise ConfigurationError("--port must be between 1 and 65535")
        serve_dashboard(settings, manifest, args.host, args.port)
    else:  # pragma: no cover - argparse makes this unreachable
        logger.error("Unknown command: %s", command)
        return 2
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return execute(args)
    except ConfigurationError as error:
        parser.error(str(error))
    except KeyboardInterrupt:
        print("Interrupted. Re-run 'resume' to continue safely.", file=sys.stderr)
        return 130
    except Exception as error:
        logging.getLogger("telegram_video_archiver").exception("Command failed")
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
