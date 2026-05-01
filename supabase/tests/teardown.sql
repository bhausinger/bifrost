-- Clean up all test data
delete from pipeline_activities where pipeline_entry_id in (
  select id from pipeline_entries where notes = 'TEST_DATA'
);
delete from excluded_artists where notes = 'TEST_DATA';
delete from pipeline_entries where notes = 'TEST_DATA';
delete from campaigns where notes = 'TEST_DATA';
delete from transactions where description like 'TEST_%';
delete from artists where notes = 'TEST_DATA';

-- Reset role
reset role;
