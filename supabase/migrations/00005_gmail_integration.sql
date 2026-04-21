-- Gmail integration: OAuth token storage + email_records fix

-- Store Gmail OAuth tokens per user
create table user_google_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expiry timestamptz,
  scopes text not null default 'https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.readonly',
  gmail_email text, -- the Gmail address used for sending
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- RLS for user_google_tokens (users can only see/manage their own tokens)
alter table user_google_tokens enable row level security;

create policy "Users can view own tokens"
  on user_google_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own tokens"
  on user_google_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tokens"
  on user_google_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete own tokens"
  on user_google_tokens for delete
  using (auth.uid() = user_id);

-- Fix email_records: BulkEmailModal inserts recipient_email but schema has to_email
-- Add the missing columns that the frontend expects
alter table email_records add column if not exists recipient_name text;
alter table email_records rename column to_email to recipient_email;

-- Add gmail_thread_id for reply detection (future)
alter table email_records add column if not exists gmail_thread_id text;

-- Add sender info
alter table email_records add column if not exists sender_email text;
alter table email_records add column if not exists sender_name text;

-- Index for token lookup
create index user_google_tokens_user_idx on user_google_tokens(user_id);
