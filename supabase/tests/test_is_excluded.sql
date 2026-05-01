-- Tests for is_excluded(p_email)
-- Depends on exclude_artist tests having run (artist1@test.com is excluded)

-- Test 1: Returns true for excluded email
do $$
declare
  v_result boolean;
begin
  select is_excluded('artist1@test.com') into v_result;

  if v_result is not true then
    raise exception 'FAIL: should return true for excluded email';
  end if;
  raise notice 'PASS: returns true for excluded email';
end $$;

-- Test 2: Returns false for non-excluded email
do $$
declare
  v_result boolean;
begin
  select is_excluded('nobody@test.com') into v_result;

  if v_result is not false then
    raise exception 'FAIL: should return false for non-excluded email';
  end if;
  raise notice 'PASS: returns false for non-excluded email';
end $$;

-- Test 3: Returns false for null email
do $$
declare
  v_result boolean;
begin
  select is_excluded(null) into v_result;

  if v_result is not false then
    raise exception 'FAIL: should return false for null email';
  end if;
  raise notice 'PASS: returns false for null email';
end $$;
