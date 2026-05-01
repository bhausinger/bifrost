-- Test setup: authenticated role + test data
-- Idempotent — safe to run multiple times

-- Set authenticated role for RLS
set role authenticated;
set request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- Clean up any previous test data
delete from pipeline_activities where pipeline_entry_id in (
  select id from pipeline_entries where notes = 'TEST_DATA'
);
delete from excluded_artists where notes = 'TEST_DATA';
delete from pipeline_entries where notes = 'TEST_DATA';
delete from campaigns where notes = 'TEST_DATA';
delete from transactions where description like 'TEST_%';
delete from artists where notes = 'TEST_DATA';

-- Insert test artists
insert into artists (id, name, email, status, source, notes)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Test Artist One', 'artist1@test.com', 'lead', 'test', 'TEST_DATA'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Test Artist Two', 'artist2@test.com', 'client', 'test', 'TEST_DATA');

-- Insert test pipeline entries
insert into pipeline_entries (id, artist_id, stage, notes)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'discovered', 'TEST_DATA'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'contacted', 'TEST_DATA');

-- Insert test campaign
insert into campaigns (id, artist_id, name, status, notes)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Test Campaign', 'active', 'TEST_DATA');

-- Insert test transactions
insert into transactions (type, amount, description, transaction_date)
values
  ('income', 500, 'TEST_income', now()::date),
  ('expense', 200, 'TEST_expense', now()::date);
