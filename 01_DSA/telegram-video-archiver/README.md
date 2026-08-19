# Authorized Telegram Video Archiver

A local, resumable command-line tool for downloading and organizing video media from a Telegram channel or group that the authenticated account is authorized to access and archive. It uses the Telegram API through [Telethon](https://docs.telethon.dev/) and never attempts to bypass access controls, DRM, paywalls, authentication, or private-content protections.

Use it only for content you have permission to download and retain. The source remains subject to Telegram's terms and the content owner's rights.

## Features

- Separates discovery from downloading, so the first network operation is always metadata-only.
- Persists message metadata and download state in SQLite for safe, idempotent resume.
- Infers titles, section, and lesson order from captions, filenames, explicit numbering, message sequence, and date.
- Uses a user-editable `sections.json`—there is no course-specific taxonomy in the code.
- Writes to `filename.ext.part`, validates size/SHA-256/optional ffprobe output, then atomically promotes the file.
- Detects duplicate Telegram documents before transfer and duplicate hashes before finalization.
- Produces structured application/failure/download logs and portable archive metadata.

## Architecture and implementation plan

| Phase | Implementation |
| --- | --- |
| 1. Skeleton | `app/`, runtime directories, dependency metadata, configuration examples, tests. |
| 2. Configuration and CLI | Environment-only credentials; `discover`, `plan`, `download`, `resume`, `status`, `validate`, and `export`. |
| 3. Discovery | `app.discovery` traverses authorized messages and stores safe media metadata without requesting file bytes. |
| 4. Manifest | `app.manifest` creates a SQLite schema with statuses and duplicate references. |
| 5. Planning | `app.filename_cleaner`, `app.classifier`, and `app.organizer` produce stable paths. |
| 6–7. Download/resume | `app.downloader` appends `.part` files, retries with exponential backoff, and only atomically finalizes valid files. |
| 8. Organization | Configurable keyword classifier plus deterministic ordering and collision suffixes. |
| 9. Validation | File existence/size/SHA-256 and ffprobe, where installed. |
| 10–11. Tests | Offline unit tests use temp SQLite files and mocked message-shaped values; no credentials required. |
| 12. Authorized dry run | Run `plan` before any download and inspect its proposed paths. |

## Install

Requires Python 3.12 or newer. From this directory:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Optionally install `ffmpeg`/`ffprobe` on your system for media-stream integrity checks. The tool still verifies existence, expected byte size, and SHA-256 without it.

## Telegram configuration and first authentication

1. Create an API application at [my.telegram.org/apps](https://my.telegram.org/apps), then obtain your API ID and hash.
2. Copy `.env.example` to `.env`.
3. Set `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, and `TELEGRAM_SOURCE`. `TELEGRAM_SOURCE` can be an authorized channel/group identifier accepted by Telethon (for example `@authorized_source`) or a Telegram Web dialog URL such as `https://web.telegram.org/k/#-1001234567890`.
4. Optionally set `TELEGRAM_PHONE` for the first interactive sign-in. Telethon may request a Telegram verification code and, if enabled, the account's two-step-verification password.

The session is written locally under `data/` and is ignored by Git. Do not share it.

## Workflow

### 1. Discover metadata only

```powershell
python -m app.cli discover
```

This reads media messages accessible to the signed-in account and records message ID, date, filename, caption, media type, size, MIME type, dimensions, duration, a safe subset of Telegram metadata, and inferred planning data. It does not download files.

### 2. Review the dry plan

```powershell
python -m app.cli plan
# Equivalent no-transfer review while invoking download:
python -m app.cli download --dry-run
```

`plan` prints totals, duplicates, unknown/non-video media, inferred destination paths, and saves the deterministic plan in `data/archive.db`. Edit `sections.json` and run `plan` again to change classification. Existing planned/downloaded paths are preserved to prevent accidental relocation or overwrite.

### 3. Download an authorized archive

```powershell
python -m app.cli download --workers 2
python -m app.cli download --section Arrays --limit 10
```

Transfers stream to `*.part`. A partial file is appended only after verifying it cannot be larger than the remote metadata. A completed file is size-checked, SHA-256 hashed, inspected by ffprobe when available, then atomically renamed. An invalid existing final file is never overwritten—the command fails it with diagnostics instead.

### 4. Resume safely

```powershell
python -m app.cli resume
python -m app.cli download --retry-failed
```

`resume` first validates completed records, then continues `DISCOVERED`, `PLANNED`, `DOWNLOADING`, and `FAILED` records. Re-running it is idempotent: completed files are revalidated and skipped, while duplicate messages reference the canonical local file in SQLite.

### 5. Inspect, validate, and export

```powershell
python -m app.cli status
python -m app.cli validate
python -m app.cli export
python -m app.cli dashboard
```

`export` writes `metadata/index.json`, `metadata/summary.json`, and a consistent SQLite backup to the archive output directory. It also maintains `data/index.json` as a project-local convenience copy.

### Live dashboard

```powershell
python -m app.cli dashboard
```

Open `http://127.0.0.1:8765` to see live received/pending bytes, current transfer rates, estimated remaining time, active files, and failures. The dashboard is read-only, binds to your computer only by default, and does not expose credentials.

All relevant commands accept `--section`, `--limit`, `--from-message`, `--to-message`, and `--dry-run`; download/resume additionally accept `--workers`, and download accepts `--retry-failed`.

## Resulting archive layout

```text
downloads/
├── 01 - Arrays/
│   ├── 01 - Array Basics.mp4
│   └── 02 - Array Operations.mp4
├── 02 - Graphs/
│   └── 01 - Breadth First Search.mp4
└── metadata/
    ├── archive.db
    ├── index.json
    └── summary.json
```

Paths are deterministic. Explicit lesson/episode numbers rank first; then the numeric filename/caption signal, Telegram message sequence, date, and message ID give stable tie breaking. Filename collisions use a stable `[message-ID]` suffix rather than overwriting a file.

## Logs and troubleshooting

- `logs/app.log` records normal operation, `logs/errors.log` records errors, and `logs/failed-downloads.json` has machine-readable final failures.
- `data/download-log.json` records completed, skipped, duplicate, and failed transfer events.
- If an API setting is missing, run `copy .env.example .env`, fill in the values, and retry.
- If the source cannot be resolved, confirm that the currently authenticated Telegram account can access it normally and that `TELEGRAM_SOURCE` is a Telethon-supported identifier.
- If a completed target fails validation, the tool intentionally refuses to overwrite it. Inspect or move that specific file yourself, then run `resume`.
- If a `.part` file is larger than the expected Telegram size, the tool stops rather than truncating it. Inspect/remove only that exact partial file after confirming it is disposable, then resume.

## Security

Never commit `.env`, `*.session`, `data/archive.db`, generated JSON logs, or downloaded media. They are ignored by the supplied `.gitignore`. Do not place API IDs, API hashes, verification codes, passwords, phone numbers, or session data in source code, shell history, issues, or logs.

## Testing

```powershell
python -m unittest discover -s tests -v
```

The test suite never connects to Telegram and needs no credentials.
