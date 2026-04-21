-- Replace monthly_listeners with track_count on artists
alter table artists add column if not exists track_count int;
alter table artists drop column if exists monthly_listeners;
