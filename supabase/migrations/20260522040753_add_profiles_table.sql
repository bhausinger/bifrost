-- Profiles table: auto-created for each auth user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- RLS: any authenticated user can read all profiles (internal tool, 2-person team)
alter table public.profiles enable row level security;

create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'User'),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed existing users
insert into public.profiles (id, display_name, email)
select id, split_part(email, '@', 1), email
from auth.users
on conflict (id) do nothing;
