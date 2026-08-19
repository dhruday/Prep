"""Small authenticated gateway around Telethon's official Telegram API access."""

from __future__ import annotations

import os
import re
from typing import Any, AsyncIterator

from .config import ConfigurationError, Settings

try:  # Imported lazily enough that unit tests never require a Telegram installation.
    from telethon import TelegramClient
    from telethon import utils as telethon_utils
    from telethon.errors import RPCError
except ImportError:  # pragma: no cover
    TelegramClient = None  # type: ignore[assignment,misc]
    telethon_utils = None  # type: ignore[assignment]
    RPCError = Exception  # type: ignore[assignment,misc]


class TelegramGateway:
    """Authenticated access limited to the account's normally authorized sources."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client: Any | None = None
        self.entity: Any | None = None

    async def __aenter__(self) -> "TelegramGateway":
        self.settings.require_telegram()
        if TelegramClient is None:
            raise ConfigurationError("Telethon is not installed. Run: pip install -r requirements.txt")
        session_path = str(self.settings.session)
        self.client = TelegramClient(session_path, self.settings.api_id, self.settings.api_hash)
        await self.client.connect()
        if not await self.client.is_user_authorized():
            # Telethon's built-in login flow handles verification/password prompts. A phone may
            # be provided through TELEGRAM_PHONE but is never persisted by this application.
            phone = os.getenv("TELEGRAM_PHONE")
            if phone:
                await self.client.start(phone=phone)
            else:
                await self.client.start()
        self.entity = await self._resolve_source(self.settings.source or "")
        return self

    async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
        if self.client:
            await self.client.disconnect()

    @property
    def source_id(self) -> str:
        if self.entity is None:
            raise RuntimeError("Telegram gateway is not connected")
        return str(self.entity.id)

    @property
    def public_source(self) -> str | None:
        """Return a public username only when Telegram exposes one for this entity."""
        if self.entity is None:
            raise RuntimeError("Telegram gateway is not connected")
        return getattr(self.entity, "username", None)

    async def _resolve_source(self, source: str) -> Any:
        """Resolve normal Telethon identifiers and Telegram Web dialog URLs.

        A Web URL is normalized only to an ID and matched against the authenticated
        account's existing dialog cache. It does not grant access to a source the
        account cannot ordinarily see.
        """
        source = source.strip()
        fragment_match = re.fullmatch(r"https?://web\.telegram\.org/[^#]+#(-?\d+)", source, flags=re.I)
        raw_id = fragment_match.group(1) if fragment_match else source
        candidates: list[object] = [raw_id]
        if re.fullmatch(r"-?\d+", raw_id):
            numeric_id = int(raw_id)
            candidates.insert(0, numeric_id)
            # Telegram Web may expose an unmarked channel ID; Telethon uses -100<id>.
            if numeric_id < 0 and not str(numeric_id).startswith("-100"):
                candidates.append(int(f"-100{abs(numeric_id)}"))
        for candidate in candidates:
            try:
                return await self.client.get_entity(candidate)
            # Numeric Web fragments can be interpreted as a legacy chat ID before
            # Telethon sees the corresponding marked channel ID. In that case the
            # authenticated-dialog fallback below is the safe resolver.
            except (ValueError, TypeError, RPCError):
                continue
        if not (fragment_match and telethon_utils):
            raise ValueError(f"Could not resolve the authorized Telegram source: {source!r}")
        candidate_ids = {str(candidate) for candidate in candidates if isinstance(candidate, int)}
        async for dialog in self.client.iter_dialogs():
            peer_id = str(telethon_utils.get_peer_id(dialog.entity))
            if peer_id in candidate_ids:
                return dialog.entity
        raise ValueError(
            "The Telegram Web dialog ID was not found among this authenticated account's dialogs. "
            "Confirm that the account can access the source and that the URL is complete."
        )

    async def iter_messages(
        self, *, limit: int | None = None, from_message: int | None = None, to_message: int | None = None
    ) -> AsyncIterator[Any]:
        if self.client is None or self.entity is None:
            raise RuntimeError("Telegram gateway is not connected")
        yielded = 0
        # ``reverse=True`` produces chronological delivery; message ids remain the canonical tie break.
        async for message in self.client.iter_messages(self.entity, reverse=True):
            if from_message is not None and message.id < from_message:
                continue
            if to_message is not None and message.id > to_message:
                continue
            yield message
            yielded += 1
            if limit is not None and yielded >= limit:
                break

    async def get_message(self, message_id: int) -> Any | None:
        if self.client is None or self.entity is None:
            raise RuntimeError("Telegram gateway is not connected")
        return await self.client.get_messages(self.entity, ids=message_id)

    async def iter_download(self, document: Any, *, offset: int, chunk_size: int) -> AsyncIterator[bytes]:
        if self.client is None:
            raise RuntimeError("Telegram gateway is not connected")
        async for chunk in self.client.iter_download(
            document,
            offset=offset,
            request_size=chunk_size,
            chunk_size=chunk_size,
        ):
            yield bytes(chunk)
