# Lead Generator — Design Spec

## Overview

A lead generation tool that discovers new SoundCloud artists from a seed profile, scrapes their full profiles, and imports them into the pipeline. Replaces the current mock-based scraper with TempoV3's proven API-based approach.

## Two Deliverables

1. **LeadGeneratorModal** — new React component for artist discovery
2. **Scraper rewrite** — replace mock SoundCloudScraper with SoundCloud API-based implementation

---

## 1. LeadGeneratorModal

### Location
`apps/dashboard/src/components/pipeline/LeadGeneratorModal.tsx`

### Access
Button on the Pipeline page toolbar, next to existing "Import from Scraper" button.

### 4-Step Flow

**Step 1: Configure**
- Seed artist SoundCloud URL (text input)
- Genre multi-select (Electronic, Hip-Hop, Pop, R&B, Rock, Indie, House, Techno, Drum & Bass, Dubstep, Trap, Lo-Fi, Ambient, Soul, Funk, Latin, UKG, Jungle, Grime, Afrobeats, Amapiano, Jersey Club, Drill, Phonk)
- Follower range: min (default 2000) and max (default 50000)
- Upload recency: dropdown (Last 30 days, Last 3 months, Last 6 months, Last year, Any time)
- Max results: number input (default 100)
- "Discover" button

**Step 2: Discover (loading state)**
- Calls `POST scraper:9999/api/discovery/discover` with config
- Shows spinner with seed artist name
- On completion, transitions to Step 3

**Step 3: Review & Scrape**
- Results table showing discovered artists:
  - Avatar, Name, Followers, Track Count, Genre, Location, SoundCloud link
  - Checkbox for selection
  - "Already in pipeline" badge for duplicates (disabled checkbox)
- Stats bar: total found, filtered count, filter breakdown
- Toolbar: Select All, Deselect All, selected count
- "Scrape Selected" button → triggers full profile scrape
- Scrape progress shown inline (X/Y scraped, emails found count, ETA)
- After scrape completes, table updates with email column, social links, most recent track

**Step 4: Import**
- Same pattern as existing ScraperModal:
  - Inline email editing
  - Import stage selector (Discovered / Contacted / Responded)
  - Duplicate detection against existing artists in Supabase
  - Blocked terms filtering (from `blocked_terms` table)
  - CSV export button
  - "Import Selected" button → creates artist + pipeline_entry records

### Duplicate Detection
- Before showing results, check existing `artists` table by soundcloud_url
- Flag duplicates with yellow highlight and disabled checkbox
- Check `excluded_artists` table — flag excluded artists

### Blocked Terms Filtering
- Query `blocked_terms` table before showing results
- Filter out artists whose email domain matches any `email_domain` type blocked term
- Filter out artists whose name matches any `profile_name` type blocked term
- Show filtered count in stats

---

## 2. Scraper Rewrite

### Current Problem
`apps/scraper/src/services/soundcloud_scraper.py` uses BeautifulSoup HTML scraping and returns placeholder/mock data. The `artist_discovery.py` service uses OpenAI stubs.

### Solution
Replace with TempoV3's approach: use SoundCloud's public API (`api-v2.soundcloud.com`) with a client_id. No browser needed for discovery or basic scraping.

### New SoundCloudScraper Class
Replace `apps/scraper/src/services/soundcloud_scraper.py` entirely.

**Core capabilities (from TempoV3):**
- `_api_get()` — throttled HTTP requests with rate-limit handling (429 retry with backoff)
- `_resolve_user(url)` — resolve SoundCloud URL to user object via `/resolve` endpoint
- `scrape_artist(url)` — full profile scrape: resolve user, get latest track, extract email from bio, build response
- `scrape_multiple_artists(urls)` — sequential scraping with delays
- `discover_artists(seed_url, filters)` — the discovery engine (see below)

**Discovery method (`discover_artists`):**
1. Resolve seed artist URL → get user ID
2. Gather candidates concurrently from:
   - Related artists (SC recommendation engine, up to 50)
   - Seed's followings with pagination (up to 600)
   - Seed's followers with pagination (up to 600)
   - User search queries (seed name + genre variants, 2 pages each)
   - Track tag searches per genre (finds artists via their tracks)
3. 2nd-degree expansion: get related artists + followings from top 3 related artists
4. Deduplicate by SC user ID
5. Filter: follower range, minimum 1 track, upload recency
6. Sort by followers descending
7. Return lightweight results (name, url, followers, track_count, genre, avatar, city, country, sc_user_id)

**Helper methods:**
- `search_users(query, limit, offset)` — search SC users
- `search_tracks_by_tag(tag, limit)` — search tracks by tag, extract unique artists
- `get_related_artists(user_id, limit)` — SC recommendation engine
- `get_user_followings(user_id, limit)` / paginated version
- `get_user_followers(user_id, limit)` / paginated version
- `get_user_tracks(user_id, limit)` — get user's tracks
- `_normalize_url(url)` — clean up SC URLs
- `_extract_email_from_bio(bio)` — regex email extraction from bio text
- `_build_artist_data(user, url, recent_track)` — assemble response object
- `_refresh_client_id()` — scrape new client_id from SC frontend if current one expires

**Rate limiting:**
- Semaphore: max 3 concurrent SC API requests
- Minimum 500ms between requests
- 429 retry with exponential backoff (up to 4 attempts)

### New Discovery Route
Replace `apps/scraper/src/api/routes/discovery.py` with a single `/discover` endpoint.

**Request:**
```json
{
  "seed_url": "https://soundcloud.com/artist-name",
  "min_followers": 2000,
  "max_followers": 50000,
  "genres": ["Electronic", "House"],
  "uploaded_within_days": 365,
  "max_results": 100
}
```

**Response:**
```json
{
  "results": [
    {
      "name": "Artist Name",
      "url": "https://soundcloud.com/artist-name",
      "followers": 12500,
      "track_count": 45,
      "genre": "Electronic",
      "last_modified": "2026-01-15T...",
      "avatar_url": "https://...",
      "city": "Berlin",
      "country": "DE",
      "sc_user_id": 12345
    }
  ],
  "total_found": 342,
  "filtered_count": 100,
  "seed_artist": "Seed Name",
  "seed_genre": "Electronic",
  "filter_stats": {
    "followers_low": 25,
    "followers_high": 18,
    "no_tracks": 5,
    "too_old": 30
  }
}
```

### Updated Scrape Route
Update `apps/scraper/src/api/routes/soundcloud.py` to use the new SoundCloudScraper. Keep the existing `/scrape/soundcloud` endpoint signature for ScraperModal compatibility, but use real API-based scraping.

**Scrape response fields:**
- artist_name, soundcloud_url, email, followers, location, bio
- social_links (instagram, twitter, spotify, youtube, facebook, website)
- track_count, most_recent_upload_date, most_recent_song_title, most_recent_song_url
- total_plays, total_likes, profile_image_url
- success, error_message

### Remove Dead Code
- Delete `apps/scraper/src/services/artist_discovery.py` (OpenAI stub service)
- Delete unused mock methods from old scraper
- Keep `hybrid_scraper.py`, `playwright_scraper.py` for future email enrichment fallback

---

## 3. Blocked Terms Infrastructure

### Database
New Supabase migration creating `blocked_terms` table:

```sql
CREATE TABLE blocked_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_domain', 'profile_name')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX blocked_terms_term_type_idx ON blocked_terms(term, type);
```

### Settings Page
Add "Blocked Terms" section to existing Settings page:
- Two lists: Email Domains and Profile Name Keywords
- Add form: text input + type selector + add button
- Each term has a delete button
- Simple table layout, no pagination needed (small list)

### Integration Points
- LeadGeneratorModal queries blocked_terms before displaying discovery results
- ScraperModal queries blocked_terms before displaying scrape results (enhancement)
- Filtering happens client-side after fetching the (small) blocked_terms list

---

## 4. What Stays Unchanged

- **ScraperModal** — existing paste-URLs flow, untouched (but will benefit from real scraper)
- **Pipeline kanban** — no changes
- **Exclude list** — no changes
- **BulkEmailModal** — no changes
- **Playwright scraper** — kept for future contact enrichment
- **Scraper FastAPI structure** — same app, routes reorganized

---

## Technical Notes

- **No Express server involved** — dashboard talks directly to scraper (port 9999) and Supabase
- **SoundCloud client_id** — embedded in SC's frontend JS, may need periodic refresh. Scraper handles this automatically.
- **Discovery is fast** (~5-15 seconds) because it's API calls, not page scraping
- **Full scrape is slower** (~2-3 seconds per artist) due to rate limiting
- **httpx** replaces aiohttp for the SC API client (TempoV3 pattern, better async support)
