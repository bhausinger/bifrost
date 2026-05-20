-- Migration: Replace Gmail infrastructure with Resend
-- Renames gmail-specific columns to generic names and drops gmail token storage.

-- Rename gmail_message_id → external_message_id in email_records
alter table email_records rename column gmail_message_id to external_message_id;

-- Rename gmail_thread_id → external_thread_id in email_records
alter table email_records rename column gmail_thread_id to external_thread_id;

-- Drop user_google_tokens table (Gmail OAuth tokens no longer needed)
drop policy if exists "Users can view own tokens" on user_google_tokens;
drop policy if exists "Users can insert own tokens" on user_google_tokens;
drop policy if exists "Users can update own tokens" on user_google_tokens;
drop policy if exists "Users can delete own tokens" on user_google_tokens;
drop index if exists user_google_tokens_user_idx;
drop table if exists user_google_tokens;
