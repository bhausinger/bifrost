-- Campaign Manager v2 — Initial Schema
-- Spotify playlist placement agency tool

-- Artists (our leads/clients)
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
  source text default 'manual',
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pipeline: tracks where each artist is in our sales funnel
create table pipeline_entries (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references artists(id) on delete cascade not null,
  stage text not null default 'discovered',
  deal_value numeric(10,2),
  package_type text,
  notes text,
  assigned_to uuid references auth.users(id),
  stage_entered_at timestamptz default now(),
  contacted_at timestamptz,
  responded_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity log for pipeline entries
create table pipeline_activities (
  id uuid primary key default gen_random_uuid(),
  pipeline_entry_id uuid references pipeline_entries(id) on delete cascade not null,
  type text not null,
  description text not null,
  metadata jsonb default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Playlist curators (our supply side — we pay them)
create table curators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  payment_method text,
  payment_handle text,
  notes text,
  is_active boolean default true,
  reliability_score int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Playlists in our curator network
create table playlists (
  id uuid primary key default gen_random_uuid(),
  curator_id uuid references curators(id) on delete cascade not null,
  name text not null,
  spotify_url text,
  spotify_playlist_id text,
  genre text,
  follower_count int default 0,
  price_per_placement numeric(10,2),
  avg_streams_per_placement int,
  is_active boolean default true,
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Campaigns: group placements for one client
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  pipeline_entry_id uuid references pipeline_entries(id) on delete set null,
  artist_id uuid references artists(id) on delete cascade not null,
  name text not null,
  track_name text,
  track_spotify_url text,
  track_spotify_id text,
  status text default 'draft',
  total_budget numeric(10,2),
  total_cost numeric(10,2),
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
  status text default 'pending',
  cost numeric(10,2),
  placed_at timestamptz,
  removed_at timestamptz,
  streams_attributed int default 0,
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
  source text default 'manual',
  snapshot_date date not null,
  created_at timestamptz default now()
);

-- Financial transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  amount numeric(10,2) not null,
  description text,
  category text,
  campaign_id uuid references campaigns(id) on delete set null,
  artist_id uuid references artists(id) on delete set null,
  curator_id uuid references curators(id) on delete set null,
  payment_method text,
  reference_id text,
  transaction_date date not null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Email templates
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  template_type text,
  variables text[] default '{}',
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
  status text default 'sent',
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  gmail_message_id text,
  created_at timestamptz default now()
);

-- Exclude list: artists who asked not to be contacted
create table excluded_artists (
  id uuid primary key default gen_random_uuid(),
  email text,
  artist_name text,
  artist_id uuid references artists(id) on delete set null,
  reason text not null default 'opt_out',
  notes text,
  excluded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create unique index excluded_artists_email_idx on excluded_artists(email) where email is not null;

-- Indexes for common queries
create index pipeline_entries_stage_idx on pipeline_entries(stage);
create index pipeline_entries_artist_idx on pipeline_entries(artist_id);
create index pipeline_activities_entry_idx on pipeline_activities(pipeline_entry_id);
create index campaigns_artist_idx on campaigns(artist_id);
create index campaigns_status_idx on campaigns(status);
create index placements_campaign_idx on placements(campaign_id);
create index transactions_type_idx on transactions(type);
create index transactions_date_idx on transactions(transaction_date);
create index email_records_artist_idx on email_records(artist_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger artists_updated_at before update on artists for each row execute function update_updated_at();
create trigger pipeline_entries_updated_at before update on pipeline_entries for each row execute function update_updated_at();
create trigger curators_updated_at before update on curators for each row execute function update_updated_at();
create trigger playlists_updated_at before update on playlists for each row execute function update_updated_at();
create trigger campaigns_updated_at before update on campaigns for each row execute function update_updated_at();
create trigger placements_updated_at before update on placements for each row execute function update_updated_at();
create trigger email_templates_updated_at before update on email_templates for each row execute function update_updated_at();
