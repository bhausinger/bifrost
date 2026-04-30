-- Add status column to distinguish leads (pipeline) from clients (artists page)
-- Leads come from scraper/lead gen and live in the pipeline.
-- Clients are artists who agreed to work with us (have campaigns or were added manually as clients).

alter table artists
  add column status text not null default 'lead';

-- Backfill: any artist that has a campaign is already a client
update artists set status = 'client'
where id in (select distinct artist_id from campaigns);

-- Index for filtering artists by status
create index artists_status_idx on artists(status);
