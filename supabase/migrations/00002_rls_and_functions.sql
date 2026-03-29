-- Row Level Security: both users can access everything
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'artists', 'pipeline_entries', 'pipeline_activities',
    'curators', 'playlists', 'campaigns', 'placements',
    'stream_snapshots', 'transactions', 'email_templates',
    'email_records', 'excluded_artists'
  ]) loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "authenticated_full_access" on %I for all using (auth.role() = ''authenticated'')',
      t
    );
  end loop;
end $$;

-- Move pipeline stage with activity logging
create or replace function move_pipeline_stage(
  entry_id uuid,
  new_stage text,
  note text default null
) returns void as $$
declare
  old_stage text;
begin
  select stage into old_stage from pipeline_entries where id = entry_id;

  insert into pipeline_activities (pipeline_entry_id, type, description, metadata, created_by)
  values (
    entry_id, 'stage_change',
    'Moved from ' || old_stage || ' to ' || new_stage,
    jsonb_build_object('old_stage', old_stage, 'new_stage', new_stage, 'note', note),
    auth.uid()
  );

  update pipeline_entries set
    stage = new_stage,
    stage_entered_at = now(),
    contacted_at = case when new_stage = 'contacted' then coalesce(contacted_at, now()) else contacted_at end,
    responded_at = case when new_stage = 'responded' then coalesce(responded_at, now()) else responded_at end,
    paid_at = case when new_stage = 'paid' then coalesce(paid_at, now()) else paid_at end,
    completed_at = case when new_stage = 'completed' then now() else completed_at end
  where id = entry_id;
end;
$$ language plpgsql security definer;

-- Exclude an artist
create or replace function exclude_artist(
  p_artist_id uuid,
  p_email text,
  p_reason text default 'opt_out',
  p_notes text default null
) returns void as $$
begin
  insert into excluded_artists (email, artist_name, artist_id, reason, notes, excluded_by)
  select p_email, a.name, a.id, p_reason, p_notes, auth.uid()
  from artists a where a.id = p_artist_id
  on conflict (email) do update set
    reason = p_reason,
    notes = p_notes;

  -- Log activity on active pipeline entries before moving them
  insert into pipeline_activities (pipeline_entry_id, type, description, metadata, created_by)
  select pe.id, 'stage_change',
    'Artist excluded: ' || coalesce(p_notes, p_reason),
    jsonb_build_object('old_stage', pe.stage, 'new_stage', 'lost', 'reason', p_reason),
    auth.uid()
  from pipeline_entries pe
  where pe.artist_id = p_artist_id and pe.stage not in ('completed', 'lost');

  update pipeline_entries set
    stage = 'lost',
    lost_reason = p_reason
  where artist_id = p_artist_id and stage not in ('completed', 'lost');
end;
$$ language plpgsql security definer;

-- Check if email is excluded
create or replace function is_excluded(p_email text)
returns boolean as $$
  select exists(select 1 from excluded_artists where email = p_email);
$$ language sql security definer;

-- Dashboard stats
create or replace function get_dashboard_stats()
returns jsonb as $$
  select jsonb_build_object(
    'pipeline', (
      select coalesce(jsonb_object_agg(stage, cnt), '{}'::jsonb)
      from (select stage, count(*) as cnt from pipeline_entries group by stage) s
    ),
    'active_campaigns', (select count(*) from campaigns where status = 'active'),
    'total_revenue', (select coalesce(sum(amount), 0) from transactions where type = 'income'),
    'total_expenses', (select coalesce(sum(amount), 0) from transactions where type = 'expense'),
    'total_artists', (select count(*) from artists),
    'excluded_count', (select count(*) from excluded_artists),
    'avg_deal_value', (select coalesce(avg(deal_value), 0) from pipeline_entries where deal_value is not null)
  );
$$ language sql security definer;
