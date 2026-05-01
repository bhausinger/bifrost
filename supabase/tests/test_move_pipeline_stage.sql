-- Tests for move_pipeline_stage(entry_id, new_stage, note)

-- Test 1: Moves entry from 'discovered' to 'contacted'
do $$
declare
  v_stage text;
begin
  perform move_pipeline_stage(
    'bbbbbbbb-0000-0000-0000-000000000001', 'contacted', 'test move'
  );
  select stage into v_stage from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000001';

  if v_stage != 'contacted' then
    raise exception 'FAIL: stage should be contacted, got %', v_stage;
  end if;
  raise notice 'PASS: stage changed to contacted';
end $$;

-- Test 2: Sets contacted_at timestamp
do $$
declare
  v_ts timestamptz;
begin
  select contacted_at into v_ts from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000001';

  if v_ts is null then
    raise exception 'FAIL: contacted_at should be set';
  end if;
  raise notice 'PASS: contacted_at is set';
end $$;

-- Test 3: Sets stage_entered_at to current time
do $$
declare
  v_ts timestamptz;
begin
  select stage_entered_at into v_ts from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000001';

  if v_ts is null or v_ts < now() - interval '5 seconds' then
    raise exception 'FAIL: stage_entered_at should be recent';
  end if;
  raise notice 'PASS: stage_entered_at is recent';
end $$;

-- Test 4: Does NOT overwrite existing contacted_at (COALESCE)
do $$
declare
  v_before timestamptz;
  v_after timestamptz;
begin
  select contacted_at into v_before from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000001';

  -- Move away and back to contacted
  perform move_pipeline_stage('bbbbbbbb-0000-0000-0000-000000000001', 'responded', null);
  perform move_pipeline_stage('bbbbbbbb-0000-0000-0000-000000000001', 'contacted', null);

  select contacted_at into v_after from pipeline_entries
    where id = 'bbbbbbbb-0000-0000-0000-000000000001';

  if v_before != v_after then
    raise exception 'FAIL: contacted_at was overwritten (% -> %)', v_before, v_after;
  end if;
  raise notice 'PASS: contacted_at preserved by COALESCE';
end $$;

-- Test 5: Creates pipeline_activity with type=stage_change
do $$
declare
  v_count int;
begin
  select count(*) into v_count from pipeline_activities
    where pipeline_entry_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and type = 'stage_change';

  if v_count < 1 then
    raise exception 'FAIL: no stage_change activity found';
  end if;
  raise notice 'PASS: stage_change activity created (% records)', v_count;
end $$;

-- Test 6: Activity description includes old and new stage names
do $$
declare
  v_desc text;
begin
  select description into v_desc from pipeline_activities
    where pipeline_entry_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and type = 'stage_change'
    order by created_at asc limit 1;

  if v_desc not like '%discovered%' or v_desc not like '%contacted%' then
    raise exception 'FAIL: description missing stage names: %', v_desc;
  end if;
  raise notice 'PASS: activity description includes stage names';
end $$;
