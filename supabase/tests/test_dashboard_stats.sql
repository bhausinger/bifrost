-- Tests for get_dashboard_stats()

do $$
declare
  v_stats jsonb;
  v_revenue numeric;
  v_expenses numeric;
  v_campaigns int;
  v_artists int;
begin
  select get_dashboard_stats() into v_stats;

  -- Test 1: Returns JSONB with pipeline key
  if v_stats->'pipeline' is null then
    raise exception 'FAIL: stats missing pipeline key';
  end if;
  raise notice 'PASS: pipeline key present in stats';

  -- Test 2: total_revenue includes test income
  v_revenue := (v_stats->>'total_revenue')::numeric;
  if v_revenue < 500 then
    raise exception 'FAIL: total_revenue should be >= 500, got %', v_revenue;
  end if;
  raise notice 'PASS: total_revenue >= 500 (got %)', v_revenue;

  -- Test 3: total_expenses includes test expense
  v_expenses := (v_stats->>'total_expenses')::numeric;
  if v_expenses < 200 then
    raise exception 'FAIL: total_expenses should be >= 200, got %', v_expenses;
  end if;
  raise notice 'PASS: total_expenses >= 200 (got %)', v_expenses;

  -- Test 4: active_campaigns includes test campaign
  v_campaigns := (v_stats->>'active_campaigns')::int;
  if v_campaigns < 1 then
    raise exception 'FAIL: active_campaigns should be >= 1, got %', v_campaigns;
  end if;
  raise notice 'PASS: active_campaigns >= 1 (got %)', v_campaigns;

  -- Test 5: total_artists includes test artists
  v_artists := (v_stats->>'total_artists')::int;
  if v_artists < 2 then
    raise exception 'FAIL: total_artists should be >= 2, got %', v_artists;
  end if;
  raise notice 'PASS: total_artists >= 2 (got %)', v_artists;
end $$;
