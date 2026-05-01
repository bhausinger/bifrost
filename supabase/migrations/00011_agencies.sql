-- Agencies represent management companies / reps who send us artist campaigns.
-- One agency can have many artists.

create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  contact_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: authenticated users get full access (same pattern as other tables)
alter table agencies enable row level security;
create policy "authenticated_full_access" on agencies
  for all using (auth.role() = 'authenticated');

-- Link artists to agencies (optional)
alter table artists
  add column agency_id uuid references agencies(id);

create index artists_agency_id_idx on artists(agency_id);
