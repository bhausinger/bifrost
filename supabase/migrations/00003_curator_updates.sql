-- Add new curator fields
alter table curators add column if not exists contact_name text;
alter table curators add column if not exists genres text[] default '{}';
alter table curators add column if not exists price_per_10k numeric(10,2);
alter table curators add column if not exists payment_code text;
alter table curators drop column if exists reliability_score;

-- Add country to playlists
alter table playlists add column if not exists country text;

-- Curator outreach tracker
create table if not exists curator_outreach (
  id uuid primary key default gen_random_uuid(),
  playlist_name text not null,
  playlist_url text,
  email text,
  genre text,
  is_organic boolean,
  emailed_at timestamptz,
  followed_up_at timestamptz,
  replied_at timestamptz,
  confirmed_at timestamptz,
  price_per_10k numeric(10,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger curator_outreach_updated_at before update on curator_outreach
  for each row execute function update_updated_at();
