"""Bounded exponential-backoff helpers for transient download failures."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar


T = TypeVar("T")


async def with_backoff(
    action: Callable[[int], Awaitable[T]],
    *,
    attempts: int,
    base_delay: float,
    on_error: Callable[[Exception, int], None] | None = None,
) -> T:
    """Try ``action`` a bounded number of times, raising the final error."""
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return await action(attempt)
        except Exception as error:
            last_error = error
            if on_error:
                on_error(error, attempt)
            if attempt < attempts:
                await asyncio.sleep(base_delay * (2 ** (attempt - 1)))
    assert last_error is not None
    raise last_error
