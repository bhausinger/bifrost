-- Add created_by to artists and pipeline_entries for ownership tracking
alter table artists add column if not exists created_by uuid references auth.users(id);
alter table pipeline_entries add column if not exists created_by uuid references auth.users(id);
