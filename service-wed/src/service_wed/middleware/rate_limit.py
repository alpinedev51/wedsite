"""Redis-backed limits on code-entry / find-invitation / login.

Implemented as a FastAPI dependency factory rather than a blanket
BaseHTTPMiddleware: each of these three endpoints needs its own bucket and
its own limit (a login attempt is far more sensitive than reloading an
invitation page), and a dependency composes naturally with the existing
Depends() chain each route already has -- no separate path-matching logic
needed to decide which requests get throttled.

Uses the same ArqRedis pool the queue already opened (see adapters/redis.py
and bootstrap.py) via the request's AppContainer; no separate connection
pool for this.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from service_wed.bootstrap import AppContainer
from service_wed.dependencies import get_container


def rate_limit(key: str, *, limit: int, window_seconds: int):
    """Build a dependency that allows at most `limit` requests per
    `window_seconds` per client IP, under the given logical bucket `key`.

    Fixed-window counting (INCR + EXPIRE-on-first-hit): one Redis round trip
    per request on the common path, at the cost of allowing up to ~2x
    `limit` requests across a window boundary. That's an acceptable trade
    for "stop brute-force/scraping traffic," not a precise quota -- a
    sliding-window log would cost more Redis ops for a guarantee this app
    doesn't need.
    """

    async def dependency(
        request: Request,
        container: Annotated[AppContainer, Depends(get_container)],
    ) -> None:
        # request.client is None only for in-process test clients that don't
        # set up a transport address; real requests always have one.
        client_ip = request.client.host if request.client else "unknown"
        redis_key = f"ratelimit:{key}:{client_ip}"

        count = await container.redis.incr(redis_key)
        if count == 1:
            # Only the request that just created the key sets its expiry --
            # otherwise every subsequent hit within the window would push
            # the expiry back out and the window would never actually close.
            await container.redis.expire(redis_key, window_seconds)

        if count > limit:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many requests. Please try again later.",
            )

    return dependency
