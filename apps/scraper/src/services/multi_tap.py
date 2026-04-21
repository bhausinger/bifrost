"""
Multi-Tap Discovery — genre-driven artist discovery from 5 parallel sources.
Ported from TempoV3's Smart Lead Generator.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

from .models import SC_API, GENRE_VARIANTS

logger = logging.getLogger(__name__)


async def multi_tap_discover(
    scraper: Any,  # SoundCloudScraper instance
    genre: str,
    min_followers: int = 2000,
    max_followers: int = 50000,
    seed_url: Optional[str] = None,
    uploaded_within_days: Optional[int] = None,
    target_pool: int = 1000,
    progress_callback: Optional[Any] = None,
) -> dict:
    """
    Multi-tap genre-driven discovery. Pulls candidates from 5 parallel
    sources to build a diverse pool of 500-1000 artists.
    """
    genre_lower = genre.lower().strip()
    variants = GENRE_VARIANTS.get(genre_lower, [])
    all_genres = [genre_lower] + [v for v in variants if v != genre_lower]

    pool: dict[int, dict] = {}  # sc_user_id -> user dict
    tap_stats = {"trending": 0, "playlists": 0, "labels": 0, "seed_graph": 0, "genre_search": 0}

    def _add_to_pool(users: list[dict], source: str) -> int:
        added = 0
        for user in users:
            uid = user.get("id")
            if not uid or uid in pool:
                continue
            followers = user.get("followers_count", 0) or 0
            if followers < min_followers or followers > max_followers:
                continue
            tc = user.get("track_count")
            if tc is not None and tc < 1:
                continue
            user["_source_tap"] = source
            pool[uid] = user
            added += 1
        return added

    async def _notify(event: str, data: dict) -> None:
        if progress_callback:
            try:
                await progress_callback(event, data)
            except Exception:
                pass

    # --- Tap 1: Trending tracks ---
    async def tap_trending() -> int:
        users = await _search_trending_tracks(scraper, genre_lower, all_genres, pages=3)
        count = _add_to_pool(users, "trending")
        tap_stats["trending"] = count
        await _notify("tap_complete", {"tap": "trending", "candidates": count})
        return count

    # --- Tap 2: Playlist mining ---
    async def tap_playlists() -> int:
        users = await _search_playlists(scraper, genre_lower, max_playlists=20)
        count = _add_to_pool(users, "playlists")
        tap_stats["playlists"] = count
        await _notify("tap_complete", {"tap": "playlists", "candidates": count})
        return count

    # --- Tap 3: Label rosters ---
    async def tap_labels() -> int:
        users = await _find_label_rosters(scraper, genre_lower, max_labels=10)
        count = _add_to_pool(users, "labels")
        tap_stats["labels"] = count
        await _notify("tap_complete", {"tap": "labels", "candidates": count})
        return count

    # --- Tap 4: Seed graph (optional) ---
    async def tap_seed_graph() -> int:
        if not seed_url:
            await _notify("tap_complete", {"tap": "seed_graph", "candidates": 0, "skipped": True})
            return 0
        from .models import normalize_url
        clean = normalize_url(seed_url)
        seed_user = await scraper._resolve(clean)
        if not seed_user:
            return 0
        seed_id = seed_user.get("id")

        # Level 1
        l1 = await asyncio.gather(
            scraper._followings_paginated(seed_id, max_pages=3),
            scraper._followers_paginated(seed_id, max_pages=2),
            scraper._related(seed_id),
            return_exceptions=True,
        )
        l1_users: list[dict] = []
        for r in l1:
            if isinstance(r, list):
                l1_users.extend(r)
        count = _add_to_pool(l1_users, "seed_graph")

        # Level 2: top 10 from L1 -> their followings + related
        l1_in_pool = [u for u in l1_users if u.get("id") in pool][:10]
        l2_tasks = []
        for u in l1_in_pool:
            uid = u.get("id")
            if uid:
                l2_tasks.append(scraper._followings(uid))
                l2_tasks.append(scraper._related(uid))
        if l2_tasks:
            l2 = await asyncio.gather(*l2_tasks, return_exceptions=True)
            for r in l2:
                if isinstance(r, list):
                    count += _add_to_pool(r, "seed_graph")

        tap_stats["seed_graph"] = count
        await _notify("tap_complete", {"tap": "seed_graph", "candidates": count})
        return count

    # --- Tap 5: Genre/tag search ---
    async def tap_genre_search() -> int:
        tasks = []
        for g in all_genres[:6]:
            tasks.append(scraper._search(g, limit=200))
            tasks.append(scraper._search_tracks_by_tag(g, limit=200))
        results = await asyncio.gather(*tasks, return_exceptions=True)
        all_users: list[dict] = []
        for r in results:
            if isinstance(r, list):
                all_users.extend(r)
        count = _add_to_pool(all_users, "genre_search")
        tap_stats["genre_search"] = count
        await _notify("tap_complete", {"tap": "genre_search", "candidates": count})
        return count

    # Run all 5 taps concurrently
    await _notify("phase", {"phase": "crawl", "status": "running"})
    await asyncio.gather(
        tap_trending(), tap_playlists(), tap_labels(),
        tap_seed_graph(), tap_genre_search(),
        return_exceptions=True,
    )

    total_found = len(pool)
    await _notify("crawl_progress", {"candidates_found": total_found, "taps_completed": 5, "taps_total": 5})

    # Apply upload recency filter
    if uploaded_within_days and uploaded_within_days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=uploaded_within_days)
        filtered_pool = {}
        for uid, user in pool.items():
            last_mod = user.get("last_modified")
            if last_mod:
                try:
                    last_dt = datetime.fromisoformat(last_mod.replace("Z", "+00:00"))
                    if last_dt < cutoff:
                        continue
                except Exception:
                    pass
            filtered_pool[uid] = user
        pool = filtered_pool

    # Build results
    results = []
    for uid, user in pool.items():
        avatar = user.get("avatar_url", "")
        if avatar:
            avatar = avatar.replace("-large.", "-t200x200.")
        permalink = user.get("permalink", "")
        results.append({
            "name": user.get("username") or user.get("full_name") or "Unknown",
            "url": f"https://soundcloud.com/{permalink}" if permalink else "",
            "followers": user.get("followers_count", 0),
            "track_count": user.get("track_count", 0),
            "genre": user.get("genre", ""),
            "last_modified": user.get("last_modified", ""),
            "avatar_url": avatar,
            "city": user.get("city", ""),
            "country": user.get("country_code", ""),
            "sc_user_id": uid,
            "bio": user.get("description", ""),
            "source_tap": user.get("_source_tap", "unknown"),
        })

    return {"results": results, "total_found": total_found, "filtered_count": len(results), "tap_stats": tap_stats}


# ── Tap helpers ──────────────────────────────────────────────────────


async def _search_trending_tracks(scraper: Any, genre: str, all_genres: list[str], pages: int = 3) -> list[dict]:
    """Tap 1: trending tracks in genre, extract unique artists."""
    all_users: list[dict] = []
    seen_ids: set[int] = set()
    for page in range(pages):
        for query in [genre] + all_genres[:2]:
            params = {"q": query, "client_id": scraper.client_id, "limit": 200, "offset": page * 200}
            try:
                resp = await scraper._get(f"{SC_API}/search/tracks", params)
                if resp.status_code == 401:
                    await scraper._refresh_id()
                    params["client_id"] = scraper.client_id
                    resp = await scraper._get(f"{SC_API}/search/tracks", params)
                if resp.status_code != 200:
                    continue
                for track in resp.json().get("collection", []):
                    user = track.get("user")
                    if user and user.get("id") not in seen_ids:
                        seen_ids.add(user["id"])
                        all_users.append(user)
            except Exception as e:
                logger.debug(f"Trending search failed for {query} page {page}: {e}")
    return all_users


async def _search_playlists(scraper: Any, genre: str, max_playlists: int = 20) -> list[dict]:
    """Tap 2: find playlists in genre, extract artists from tracks."""
    queries = [
        f"best {genre} 2026", f"best {genre} 2025", f"underground {genre}",
        f"{genre} vibes", f"{genre} picks", f"{genre} new", f"{genre} mix", f"fresh {genre}",
    ]
    all_users: list[dict] = []
    seen_ids: set[int] = set()
    playlist_ids: list[int] = []

    for query in queries:
        if len(playlist_ids) >= max_playlists:
            break
        for endpoint in ["/search/playlists_without_albums", "/search/playlists"]:
            params = {"q": query, "client_id": scraper.client_id, "limit": 10}
            try:
                resp = await scraper._get(f"{SC_API}{endpoint}", params)
                if resp.status_code == 401:
                    await scraper._refresh_id()
                    params["client_id"] = scraper.client_id
                    resp = await scraper._get(f"{SC_API}{endpoint}", params)
                if resp.status_code != 200:
                    continue
                for pl in resp.json().get("collection", []):
                    pid = pl.get("id")
                    if pid and pid not in playlist_ids:
                        playlist_ids.append(pid)
                        for track in pl.get("tracks", []):
                            user = track.get("user")
                            if user and user.get("id") and user["id"] not in seen_ids:
                                seen_ids.add(user["id"])
                                all_users.append(user)
                break  # First endpoint worked, skip fallback
            except Exception:
                continue

    # Fetch full track lists for playlists
    for pid in playlist_ids:
        users = await _fetch_playlist_artists(scraper, pid)
        for u in users:
            uid = u.get("id")
            if uid and uid not in seen_ids:
                seen_ids.add(uid)
                all_users.append(u)
    return all_users


async def _fetch_playlist_artists(scraper: Any, playlist_id: int) -> list[dict]:
    """Fetch tracks from a playlist and return unique artist user objects."""
    params = {"client_id": scraper.client_id}
    try:
        resp = await scraper._get(f"{SC_API}/playlists/{playlist_id}", params)
        if resp.status_code == 401:
            await scraper._refresh_id()
            params["client_id"] = scraper.client_id
            resp = await scraper._get(f"{SC_API}/playlists/{playlist_id}", params)
        if resp.status_code != 200:
            return []
        seen: set[int] = set()
        users: list[dict] = []
        for track in resp.json().get("tracks", []):
            user = track.get("user")
            if user and user.get("id") not in seen:
                seen.add(user["id"])
                users.append(user)
        return users
    except Exception:
        return []


async def _find_label_rosters(scraper: Any, genre: str, max_labels: int = 10) -> list[dict]:
    """Tap 3: find labels/collectives in genre, return their followings."""
    label_queries = [f"{genre} label", f"{genre} collective", f"{genre} records", f"{genre} crew"]
    label_ids: list[int] = []

    for query in label_queries:
        if len(label_ids) >= max_labels:
            break
        try:
            users = await scraper._search(query, limit=50)
            for u in users:
                uid = u.get("id")
                if uid and uid not in label_ids:
                    bio = (u.get("description") or "").lower()
                    name = (u.get("username") or "").lower()
                    followings_count = u.get("followings_count", 0) or 0
                    is_label = (
                        followings_count > 20
                        and any(kw in bio or kw in name for kw in ["label", "collective", "crew", "records", "imprint"])
                    )
                    if is_label:
                        label_ids.append(uid)
                        if len(label_ids) >= max_labels:
                            break
        except Exception:
            continue

    all_users: list[dict] = []
    for lid in label_ids:
        try:
            followings = await scraper._followings_paginated(lid, max_pages=2)
            all_users.extend(followings)
        except Exception:
            continue
    return all_users
