# Campaign Manager — Full Rebuild Plan

## What This Is

A Spotify playlist placement agency tool. Artists pay us to get their tracks placed on curated playlists. We pay playlist curators to place them. This tool manages the entire pipeline from discovering artists to tracking campaign results and financials.

## Users

- 2 internal users (Benjamin + partner)
- Future: client-facing site for artists to purchase promo packages directly

## Architecture

```
campaign-manager/
├── apps/
│   ├── dashboard/          # Internal tool (React + Vite + Tailwind)
│   ├── scraper/            # Python FastAPI (cleaned up from existing)
│   └── website/            # Client-facing site (Phase 5, later)
├── supabase/
│   ├── migrations/         # Database migrations
│   ├── functions/          # Edge Functions (Stripe, Gmail, scraper proxy)
│   └── seed.sql            # Seed data
├── packages/
│   └── shared-types/       # TypeScript types shared across apps
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── supabase/config.toml    # Supabase local dev config
├── package.json
├── turbo.json
└── CLAUDE.md
```

### Why Supabase Instead of Express + Prisma

| Concern | Old (Express + Prisma) | New (Supabase) |
|---------|----------------------|----------------|
| Auth | Custom JWT, refresh tokens, bypass hacks | Supabase Auth (built-in, secure) |
| CRUD API | 8 route files, 40+ endpoints to maintain | Supabase client calls directly from frontend |
| Realtime | Custom WebSocket server | Supabase Realtime (built-in) |
| File storage | Not implemented | Supabase Storage |
| Server code | ~3,000 lines of Express routes/controllers | Edge Functions only for Stripe, Gmail, scraper |
| Database | Prisma migrations | Supabase migrations (raw SQL, more control) |

Result: ~80% less backend code to write and maintain.

### What We Keep

- **Python scraper** — real working logic for artist discovery, email scraping, contact validation
- **Domain knowledge** — CLAUDE.md spec, understanding of data relationships
- **Monorepo structure** — Turborepo + pnpm workspaces pattern

### What Gets Deleted

- `apps/frontend/` — replaced by `apps/dashboard/`
- `apps/server/` — replaced by Supabase + Edge Functions
- `packages/shared-utils/` — rebuild only what's needed
- `packages/config/`, `packages/ui-components/`, `packages/utils/` — empty, delete
- `infrastructure/` — Docker setup rebuilt for new architecture
- `docker-compose.prod.yml` — was a copy of dev, useless

---

## Database Schema

### Core Tables

```sql
-- Artists we discover and reach out to (our leads/clients)
create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  spotify_url text,
  spotify_artist_id text,
  soundcloud_url text,
  instagram_handle text,
  other_socials jsonb default '{}',
  genres text[] default '{}',
  monthly_listeners int,
  follower_count int,
  location text,
  bio text,
  image_url text,
  source text, -- how we found them: 'scraper', 'manual', 'referral', 'website'
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pipeline tracks where each artist is in our sales funnel
create table pipeline_entries (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references artists(id) on delete cascade not null,
  stage text not null default 'discovered',
    -- stages: discovered, contacted, responded, negotiating, paid, placing, active, completed, lost
  deal_value numeric(10,2), -- what they're paying us
  package_type text, -- e.g., 'basic', 'premium', 'enterprise'
  notes text,
  assigned_to uuid references auth.users(id),
  stage_entered_at timestamptz default now(), -- when they entered current stage
  contacted_at timestamptz,
  responded_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity log for each pipeline entry (emails, notes, stage changes)
create table pipeline_activities (
  id uuid primary key default gen_random_uuid(),
  pipeline_entry_id uuid references pipeline_entries(id) on delete cascade not null,
  type text not null, -- 'stage_change', 'email_sent', 'email_received', 'note', 'payment', 'call'
  description text not null,
  metadata jsonb default '{}', -- flexible data (old_stage, new_stage, email_subject, etc.)
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Playlist curators we work with (our supply side)
create table curators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  payment_method text, -- 'paypal', 'cashapp', 'venmo', 'bank_transfer'
  payment_handle text, -- their PayPal email, CashApp tag, etc.
  notes text,
  is_active boolean default true,
  reliability_score int, -- 1-5 rating based on experience
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Playlists in our network
create table playlists (
  id uuid primary key default gen_random_uuid(),
  curator_id uuid references curators(id) on delete cascade not null,
  name text not null,
  spotify_url text,
  spotify_playlist_id text,
  genre text,
  follower_count int default 0,
  price_per_placement numeric(10,2), -- what we pay the curator
  avg_streams_per_placement int, -- historical average
  is_active boolean default true,
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Campaigns group placements for a single client
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  pipeline_entry_id uuid references pipeline_entries(id) on delete set null,
  artist_id uuid references artists(id) on delete cascade not null,
  name text not null,
  track_name text,
  track_spotify_url text,
  track_spotify_id text,
  status text default 'draft', -- draft, active, completed, cancelled
  total_budget numeric(10,2), -- what the client paid
  total_cost numeric(10,2), -- what we pay curators
  target_streams int,
  actual_streams int default 0,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual track placements on playlists
create table placements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  playlist_id uuid references playlists(id) on delete set null not null,
  status text default 'pending', -- pending, placed, removed, rejected
  cost numeric(10,2), -- what we paid for this specific placement
  placed_at timestamptz,
  removed_at timestamptz,
  streams_attributed int default 0, -- streams from this placement
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stream count snapshots over time
create table stream_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  stream_count int not null,
  listener_count int,
  source text default 'manual', -- 'manual', 'spotify_api', 'import'
  snapshot_date date not null,
  created_at timestamptz default now()
);

-- Financial transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'income', 'expense'
  amount numeric(10,2) not null,
  description text,
  category text, -- 'client_payment', 'curator_payment', 'software', 'other'
  campaign_id uuid references campaigns(id) on delete set null,
  artist_id uuid references artists(id) on delete set null,
  curator_id uuid references curators(id) on delete set null,
  payment_method text, -- 'stripe', 'cashapp', 'paypal', 'bank'
  reference_id text, -- external payment ID
  transaction_date date not null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Email templates for outreach
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  template_type text, -- 'initial_outreach', 'follow_up', 'pricing', 'confirmation'
  variables text[] default '{}', -- e.g., '{artist_name, track_name, price}'
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Email send records
create table email_records (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references artists(id) on delete cascade not null,
  pipeline_entry_id uuid references pipeline_entries(id) on delete set null,
  template_id uuid references email_templates(id) on delete set null,
  to_email text not null,
  subject text not null,
  body text not null,
  status text default 'sent', -- 'draft', 'sent', 'opened', 'replied', 'bounced'
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  gmail_message_id text,
  created_at timestamptz default now()
);

-- Exclude list: artists who asked not to be contacted
-- Checked by scraper results, email sending, and discovery UI
create table excluded_artists (
  id uuid primary key default gen_random_uuid(),
  email text, -- excluded email address
  artist_name text, -- for display purposes
  artist_id uuid references artists(id) on delete set null, -- link if they were in our system
  reason text not null default 'opt_out', -- 'opt_out', 'bounced', 'spam_report', 'manual', 'unsubscribed'
  notes text, -- context: "replied asking to stop", "email bounced 3x", etc.
  excluded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Index for fast email lookups (checked on every outreach action)
create unique index excluded_artists_email_idx on excluded_artists(email) where email is not null;
```

### Exclude List Behavior

The exclude list is checked at three points:

1. **Discovery/Scraper results** — when new artists are found, their emails are checked against the exclude list. Excluded artists are flagged (greyed out, "excluded" badge) but still visible so you know they exist. They cannot be added to the pipeline.

2. **Email sending** — before any email is sent (single or bulk), the recipient is checked against the exclude list. Excluded emails are skipped and logged. This is a hard block, not a warning.

3. **Pipeline actions** — an "Exclude" button appears on every artist card and pipeline entry. One click moves them to the exclude list, removes them from the pipeline (stage → "lost", lost_reason → "opt_out"), and logs the activity.

**Adding to exclude list:**
- "Exclude" button on artist card / pipeline detail → opens modal with reason dropdown + notes field
- Bulk exclude from artist list (select multiple → "Exclude selected")
- Auto-exclude on 3+ bounced emails

**Removing from exclude list:**
- Exclude list management page with search/filter
- "Restore" button per entry (with confirmation)
- Restoring does NOT re-add them to the pipeline — just makes them contactable again

### Row Level Security

```sql
-- Simple RLS: both users can see everything
-- (No complex per-user isolation needed for 2 users)
alter table artists enable row level security;
create policy "authenticated users can do everything" on artists
  for all using (auth.role() = 'authenticated');

-- Repeat for all tables
```

### Database Functions

```sql
-- Move pipeline entry to new stage (with activity logging)
create or replace function move_pipeline_stage(
  entry_id uuid,
  new_stage text,
  note text default null
) returns void as $$
begin
  -- Log the stage change
  insert into pipeline_activities (pipeline_entry_id, type, description, metadata, created_by)
  select entry_id, 'stage_change',
    'Moved to ' || new_stage,
    jsonb_build_object('old_stage', pe.stage, 'new_stage', new_stage),
    auth.uid()
  from pipeline_entries pe where pe.id = entry_id;

  -- Update the entry
  update pipeline_entries set
    stage = new_stage,
    stage_entered_at = now(),
    updated_at = now(),
    contacted_at = case when new_stage = 'contacted' then coalesce(contacted_at, now()) else contacted_at end,
    responded_at = case when new_stage = 'responded' then coalesce(responded_at, now()) else responded_at end,
    paid_at = case when new_stage = 'paid' then coalesce(paid_at, now()) else paid_at end,
    completed_at = case when new_stage = 'completed' then now() else completed_at end
  where id = entry_id;
end;
$$ language plpgsql security definer;

-- Exclude an artist (moves to exclude list, updates pipeline, logs activity)
create or replace function exclude_artist(
  p_artist_id uuid,
  p_email text,
  p_reason text default 'opt_out',
  p_notes text default null
) returns void as $$
begin
  -- Add to exclude list
  insert into excluded_artists (email, artist_name, artist_id, reason, notes, excluded_by)
  select p_email, a.name, a.id, p_reason, p_notes, auth.uid()
  from artists a where a.id = p_artist_id
  on conflict (email) do nothing;

  -- Move any active pipeline entries to "lost"
  update pipeline_entries set
    stage = 'lost',
    lost_reason = p_reason,
    updated_at = now()
  where artist_id = p_artist_id and stage not in ('completed', 'lost');

  -- Log activity on affected pipeline entries
  insert into pipeline_activities (pipeline_entry_id, type, description, metadata, created_by)
  select pe.id, 'stage_change',
    'Artist excluded: ' || coalesce(p_notes, p_reason),
    jsonb_build_object('old_stage', pe.stage, 'new_stage', 'lost', 'reason', p_reason),
    auth.uid()
  from pipeline_entries pe
  where pe.artist_id = p_artist_id and pe.stage not in ('completed', 'lost');
end;
$$ language plpgsql security definer;

-- Check if an email is excluded (used by scraper results + email sending)
create or replace function is_excluded(p_email text)
returns boolean as $$
  select exists(select 1 from excluded_artists where email = p_email);
$$ language sql security definer;

-- Dashboard stats
create or replace function get_dashboard_stats()
returns jsonb as $$
  select jsonb_build_object(
    'pipeline', (
      select jsonb_object_agg(stage, count)
      from (select stage, count(*) from pipeline_entries group by stage) s
    ),
    'active_campaigns', (select count(*) from campaigns where status = 'active'),
    'total_revenue', (select coalesce(sum(amount), 0) from transactions where type = 'income'),
    'total_expenses', (select coalesce(sum(amount), 0) from transactions where type = 'expense'),
    'total_artists', (select count(*) from artists),
    'avg_deal_value', (select coalesce(avg(deal_value), 0) from pipeline_entries where deal_value is not null)
  );
$$ language sql security definer;
```

---

## Phase 1: Foundation + Pipeline (Week 1-2)

### Goal
Supabase project running, pipeline kanban board working, basic artist management.

### Tasks

**Supabase Setup**
- [ ] Create Supabase project
- [ ] Set up local dev with Supabase CLI (`supabase init`, `supabase start`)
- [ ] Create all database migrations (tables above)
- [ ] Set up RLS policies
- [ ] Create database functions
- [ ] Seed with sample data
- [ ] Configure auth (email/password for 2 users)

**Dashboard App Scaffolding**
- [ ] Create new React + Vite + TypeScript app in `apps/dashboard/`
- [ ] Install: `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`, `tailwindcss`, `@dnd-kit/core` (drag and drop)
- [ ] Set up Supabase client
- [ ] Set up React Query provider
- [ ] Set up routing (pipeline, artists, campaigns, finance, settings)
- [ ] Build layout: sidebar nav + main content area
- [ ] Auth: login page, protected routes, session management

**Pipeline Kanban Board**
- [ ] Kanban board component with columns for each stage
- [ ] Pipeline card component (artist name, deal value, days in stage, tags)
- [ ] Drag and drop between columns (calls `move_pipeline_stage` function)
- [ ] Click card to open detail drawer/modal
- [ ] Pipeline detail view: artist info, activity timeline, notes, actions
- [ ] Add artist to pipeline (manual entry)
- [ ] Filter/search pipeline (by tag, stage, assigned_to, date range)
- [ ] Pipeline stage counts in column headers

**Artist Management**
- [ ] Artist list view with search and filters
- [ ] Artist detail page (profile, social links, pipeline history)
- [ ] Add/edit artist form
- [ ] Import artists from CSV

**Exclude List**
- [ ] Exclude list page: searchable table of excluded artists (email, name, reason, date, notes)
- [ ] "Exclude" button on artist cards and pipeline entries (opens modal: reason dropdown + notes)
- [ ] Exclude action calls `exclude_artist()` function (adds to list, moves pipeline to "lost", logs activity)
- [ ] "Restore" button on exclude list entries (removes from list, does NOT re-add to pipeline)
- [ ] Excluded artists show "Excluded" badge in artist list (greyed out, can't be added to pipeline)
- [ ] Bulk exclude from artist list (select multiple → "Exclude selected")

**Tests (Phase 1)**
- [ ] Unit tests: Supabase client helpers, data transformations
- [ ] Integration tests: pipeline stage transitions, RLS policies
- [ ] Integration tests: exclude artist flow (exclude → verify pipeline lost → verify in exclude list → restore)
- [ ] E2E test: login → view pipeline → drag card → verify stage change
- [ ] E2E test: exclude artist → verify badge → restore → verify contactable

---

## Phase 2: Discovery + Outreach (Week 3-4)

### Goal
Find artists via scraper, email them, track communications.

### Tasks

**Scraper Cleanup**
- [ ] Clean up Python scraper (fix port config, remove dead code)
- [ ] Add tests for scraper services (pytest)
- [ ] Create Supabase Edge Function to proxy scraper calls
- [ ] Connect scraper results to artist creation in Supabase
- [ ] Discovery UI: search for artists, view results, save to pipeline
- [ ] **Exclude list check on scraper results** — flag excluded artists in results (greyed out, "excluded" badge, can't save)

**Gmail Integration**
- [ ] Supabase Edge Function for Gmail OAuth flow
- [ ] Edge Function for sending emails (with template variable replacement)
- [ ] Store Gmail tokens in Supabase (encrypted)
- [ ] Email template management UI (CRUD)
- [ ] Send email from pipeline detail view (pre-fills artist info)
- [ ] Bulk email from pipeline (select multiple → apply template → send)
- [ ] **Exclude list check before every send** — skip excluded emails, show warning in UI
- [ ] Auto-exclude on 3+ bounced emails (with reason "bounced")

**Activity Logging**
- [ ] Auto-log emails sent/received
- [ ] Manual note adding on pipeline entries
- [ ] Activity timeline component (shows all interactions)
- [ ] Stage change history with timestamps

**Tests (Phase 2)**
- [ ] Scraper unit tests (email extraction, contact validation)
- [ ] Edge Function integration tests
- [ ] E2E: discover artist → save → send email → verify activity log

---

## Phase 3: Campaign + Playlist Management (Week 5-6)

### Goal
Track playlist placements and campaign performance.

### Tasks

**Curator & Playlist Database**
- [ ] Curator list view (name, payment info, reliability, active playlists)
- [ ] Add/edit curator
- [ ] Playlist list view (name, genre, followers, price, avg streams)
- [ ] Add/edit playlist
- [ ] Playlist verification tracking (when last checked it's still active)

**Campaign Management**
- [ ] Create campaign from pipeline entry (when artist pays)
- [ ] Campaign detail view: track info, placements list, stream chart
- [ ] Add placements to campaign (select playlist → assign)
- [ ] Placement status tracking (pending → placed → active → removed)
- [ ] Stream snapshot entry (manual for now, Spotify API later)
- [ ] Stream count chart over time (per campaign)

**Dashboard**
- [ ] Overview stats: pipeline counts, active campaigns, revenue, margins
- [ ] Recent activity feed
- [ ] Campaigns needing attention (stale placements, ending soon)
- [ ] Revenue chart (weekly/monthly)

**Tests (Phase 3)**
- [ ] Campaign creation and placement assignment
- [ ] Stream snapshot aggregation
- [ ] Dashboard stats accuracy
- [ ] E2E: create campaign → add placements → log streams → view dashboard

---

## Phase 4: Finance + Payments (Week 7-8)

### Goal
Track money in and out, integrate Stripe for easy client payments.

### Tasks

**Transaction Tracking**
- [ ] Transaction list with filters (type, category, date range, campaign)
- [ ] Add transaction (income/expense, link to campaign/artist/curator)
- [ ] P&L view: revenue vs expenses, per campaign and overall
- [ ] Monthly/weekly financial summary
- [ ] Campaign profitability view (client paid - curator costs = margin)

**Stripe Integration**
- [ ] Supabase Edge Function for Stripe checkout session creation
- [ ] Webhook handler for payment confirmation
- [ ] Generate payment links for clients (send via email)
- [ ] Auto-create transaction record on Stripe payment
- [ ] Auto-advance pipeline stage to "paid" on payment

**CashApp/PayPal Tracking**
- [ ] Manual payment recording with reference IDs
- [ ] Mark pipeline entry as paid manually

**Tests (Phase 4)**
- [ ] Transaction CRUD and filtering
- [ ] P&L calculation accuracy
- [ ] Stripe webhook handling
- [ ] E2E: generate payment link → simulate payment → verify pipeline + transaction

---

## Phase 5: Client-Facing Site + Polish (Week 9-10)

### Goal
Public website where artists can purchase promo without talking to you.

### Tasks

**Public Website** (`apps/website/`)
- [ ] Landing page with packages/pricing
- [ ] Package selection → Stripe checkout
- [ ] On payment: auto-create artist + pipeline entry (stage: "paid")
- [ ] Client login to view campaign status
- [ ] Simple campaign results page (streams over time, playlists placed on)
- [ ] Form to submit track details (Spotify link, genre, etc.)

**Polish & Optimization**
- [ ] Bulk operations on pipeline (select multiple → change stage, tag, assign)
- [ ] Keyboard shortcuts for common actions
- [ ] Search everywhere (artists, campaigns, curators)
- [ ] Export data (CSV for artists, campaigns, financials)
- [ ] Mobile-responsive pipeline view

**Tests (Phase 5)**
- [ ] Public site purchase flow
- [ ] Client login and campaign viewing
- [ ] Bulk operations

---

## Testing Strategy

Every phase includes tests. Three levels:

### Unit Tests (Vitest)
- Data transformation functions
- Component rendering
- Supabase query builders
- Utility functions

### Integration Tests (Vitest + Supabase local)
- Database operations against local Supabase
- RLS policy verification
- Edge Function request/response
- Pipeline state machine transitions

### E2E Tests (Playwright)
- Critical user flows per phase
- Auth flow
- Pipeline drag-and-drop
- Campaign creation workflow
- Payment flow

### Scraper Tests (pytest)
- Email extraction accuracy
- Contact validation logic
- Rate limiting behavior
- Error handling

**Target: tests written alongside features, not after.**

---

## Tech Stack (Final)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Headless UI |
| State | Zustand (minimal, mostly React Query) |
| Data Fetching | @tanstack/react-query + Supabase client |
| Drag & Drop | @dnd-kit (pipeline kanban) |
| Charts | Recharts (stream counts, revenue) |
| Backend | Supabase (auth, database, realtime, storage, edge functions) |
| Scraper | Python + FastAPI + BeautifulSoup + Playwright |
| Payments | Stripe |
| Email | Gmail API (via Edge Function) |
| Testing | Vitest + Playwright + pytest |
| Monorepo | Turborepo + pnpm |
| Deployment | Vercel (dashboard) + Supabase (backend) + Railway/Fly (scraper) |

---

## What Gets Deleted From Current Repo

- `apps/frontend/` — replaced by `apps/dashboard/`
- `apps/server/` — replaced by Supabase
- `packages/config/` — empty
- `packages/ui-components/` — empty
- `packages/utils/` — empty
- `packages/shared-utils/` — rebuild only what's needed
- `infrastructure/` — Docker configs rebuilt
- `docker-compose.prod.yml` — was copy of dev

## What Gets Kept

- `apps/scraper/` — cleaned up, tests added
- `packages/shared-types/` — adapted for new schema
- `turbo.json` — updated for new apps
- `CLAUDE.md` — updated to reflect new architecture
- `docs/` — updated

---

## Success Criteria

Phase 1 is done when:
- You can log in, see a kanban board, drag artists between stages
- Artist data persists in Supabase
- Activity log shows stage changes
- At least 5 tests pass

Full rebuild is done when:
- Pipeline is the center of the app
- Discovery → outreach → payment → campaign → completion flow works end to end
- Financials are accurate and Stripe works
- Client-facing site accepts payments
- Test coverage exists for all critical paths
