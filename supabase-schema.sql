-- Run this in the Supabase SQL editor after creating the project.
-- Also disable public signup in Authentication > Providers > Email.

create table if not exists public.allowed_users (
  email text primary key,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.karaoke_scores (
  id uuid primary key default gen_random_uuid(),
  singer text not null,
  challenge text not null,
  song text not null,
  artist text,
  youtube_url text,
  youtube_embed_url text,
  lyrics_url text,
  score int not null check (score between 0 and 100),
  badge text,
  score_method text,
  pitch_score int,
  pitch_stability int,
  pitch_confidence int,
  media_type text not null default 'audio',
  media_path text,
  audio_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.karaoke_scores add column if not exists artist text;
alter table public.karaoke_scores add column if not exists youtube_url text;
alter table public.karaoke_scores add column if not exists youtube_embed_url text;
alter table public.karaoke_scores add column if not exists lyrics_url text;
alter table public.karaoke_scores add column if not exists score_method text;
alter table public.karaoke_scores add column if not exists pitch_score int;
alter table public.karaoke_scores add column if not exists pitch_stability int;
alter table public.karaoke_scores add column if not exists pitch_confidence int;
alter table public.karaoke_scores add column if not exists media_type text not null default 'audio';
alter table public.karaoke_scores add column if not exists media_path text;

create table if not exists public.saumya_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'note',
  title text not null,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.allowed_users enable row level security;
alter table public.karaoke_scores enable row level security;
alter table public.saumya_posts enable row level security;

create or replace function public.is_allowed_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_users
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

drop policy if exists "allowed users can read allowed users" on public.allowed_users;
create policy "allowed users can read allowed users"
on public.allowed_users for select
to authenticated
using (public.is_allowed_user());

drop policy if exists "allowed users can read karaoke scores" on public.karaoke_scores;
create policy "allowed users can read karaoke scores"
on public.karaoke_scores for select
to authenticated
using (public.is_allowed_user());

drop policy if exists "allowed users can insert karaoke scores" on public.karaoke_scores;
create policy "allowed users can insert karaoke scores"
on public.karaoke_scores for insert
to authenticated
with check (public.is_allowed_user());

drop policy if exists "allowed users can read saumya posts" on public.saumya_posts;
create policy "allowed users can read saumya posts"
on public.saumya_posts for select
to authenticated
using (public.is_allowed_user());

drop policy if exists "allowed users can insert saumya posts" on public.saumya_posts;
create policy "allowed users can insert saumya posts"
on public.saumya_posts for insert
to authenticated
with check (public.is_allowed_user());

insert into public.allowed_users (email, role)
values
  ('achokshi15@gmail.com', 'admin')
on conflict (email) do update set role = excluded.role;

insert into storage.buckets (id, name, public)
values ('karaoke-recordings', 'karaoke-recordings', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('karaoke-performances', 'karaoke-performances', false)
on conflict (id) do update set public = false;

drop policy if exists "allowed users can upload karaoke recordings" on storage.objects;
create policy "allowed users can upload karaoke recordings"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('karaoke-recordings', 'karaoke-performances')
  and public.is_allowed_user()
);

drop policy if exists "allowed users can read karaoke recordings" on storage.objects;
create policy "allowed users can read karaoke recordings"
on storage.objects for select
to authenticated
using (
  bucket_id in ('karaoke-recordings', 'karaoke-performances')
  and public.is_allowed_user()
);
