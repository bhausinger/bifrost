-- Tests for exclude_artist(p_artist_id, p_email, p_reason, p_notes)

-- Reset entry stages for a clean slate
update pipeline_entries set stage = 'discovered', lost_reason = null
  where id = 'bbbbbbbb-0000-0000-0000-000000000001';
update pipeline_entries set stage = 'contacted', lost_reason = null
  where id = 'bbbbbbbb-0000-0000-0000-000000000002';
-- Clean activities from move_pipeline_stage tests
delete from pipeline_activities
  where pipeline_entry_id in (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002'
  );

-- Test 1: Inserts into excluded_artists
do $$
declare
  v_count int;
begin
  perform exclude_artist(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'artist1@test.com', 'opt_out', 'TEST_DATA'
  );
  select count(*) into v_count from excluded_artists
    where email = 'artist1@test.com';

  if v_count != 1 then
    raise exception 'FAIL: expected 1 excluded_artists row, got %', v_count;
  end if;
  raise notice 'PASS: artist inserted into excluded_artists';
end $$;

-- Test 2: Moves active pipeline entries to 'lost'
do $$
declare
  v_stage1 text;
  v_stage2 text;
begin
  select stage into v_stage1 from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000001';
  select stage into v_stage2 from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000002';

  if v_stage1 != 'lost' or v_stage2 != 'lost' then
    raise exception 'FAIL: entries should be lost, got % and %', v_stage1, v_stage2;
  end if;
  raise notice 'PASS: active entries moved to lost';
end $$;

-- Test 3: Sets lost_reason on moved entries
do $$
declare
  v_reason text;
begin
  select lost_reason into v_reason from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000001';

  if v_reason != 'opt_out' then
    raise exception 'FAIL: lost_reason should be opt_out, got %', v_reason;
  end if;
  raise notice 'PASS: lost_reason set correctly';
end $$;

-- Test 4: Does NOT move already-completed or already-lost entries
do $$
declare
  v_stage text;
begin
  -- Set one entry to completed, then try to exclude again
  update pipeline_entries set stage = 'completed'
    where id = 'bbbbbbbb-0000-0000-0000-000000000002';

  -- Re-exclude (upsert on excluded_artists)
  perform exclude_artist(
    'aaaaaaaa-0000-0000-0000-000000000001',
    'artist1@test.com', 'bounce', 'TEST_DATA'
  );

  select stage into v_stage from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000002';

  if v_stage != 'completed' then
    raise exception 'FAIL: completed entry should stay completed, got %', v_stage;
  end if;
  raise notice 'PASS: completed/lost entries not moved';
end $$;

-- Test 5: Creates activity logs for moved entries
do $$
declare
  v_count int;
begin
  select count(*) into v_count from pipeline_activities
    where pipeline_entry_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and type = 'stage_change'
      and description like 'Artist excluded%';

  if v_count < 1 then
    raise exception 'FAIL: no exclusion activity found';
  end if;
  raise notice 'PASS: exclusion activity logged';
end $$;
