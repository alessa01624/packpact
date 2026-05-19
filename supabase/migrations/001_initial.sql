-- ============================================================
-- PackPact — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIPS
-- ============================================================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_token text unique default encode(gen_random_bytes(6), 'hex') not null,
  creator_id uuid references public.profiles(id) on delete set null,
  deadline timestamptz not null,
  phase text default 'questionnaire' not null
    check (phase in ('questionnaire', 'proposals', 'revealed')),
  created_at timestamptz default now() not null
);

alter table public.trips enable row level security;

-- Anyone can read a trip if they're a member
create policy "trips_select_member" on public.trips
  for select using (
    exists (
      select 1 from public.trip_members
      where trip_id = id and user_id = auth.uid()
    )
    or creator_id = auth.uid()
  );

-- Anyone can read a trip by invite token (for join flow)
create policy "trips_select_invite" on public.trips
  for select using (true);

create policy "trips_insert_auth" on public.trips
  for insert with check (auth.uid() = creator_id);

create policy "trips_update_creator" on public.trips
  for update using (auth.uid() = creator_id);

-- ============================================================
-- TRIP MEMBERS
-- ============================================================
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  display_name text not null,
  emoji text not null default '🦊',
  joined_at timestamptz default now() not null,
  unique (trip_id, user_id)
);

alter table public.trip_members enable row level security;

create policy "members_select_trip" on public.trip_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.trip_members tm
      where tm.trip_id = trip_members.trip_id and tm.user_id = auth.uid()
    )
  );

create policy "members_insert_auth" on public.trip_members
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- QUESTIONNAIRE RESPONSES
-- ============================================================
create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  member_id uuid references public.trip_members(id) on delete cascade not null,
  budget_max integer not null default 0,
  vibes text[] not null default '{}',
  destinations text[] not null default '{}',
  available_dates text[] not null default '{}',
  secret_wish text,
  completed_at timestamptz default now() not null,
  unique (trip_id, member_id)
);

alter table public.questionnaire_responses enable row level security;

-- Members can only see their own raw responses; aggregated data is computed in app
create policy "quest_select_own" on public.questionnaire_responses
  for select using (
    member_id in (
      select id from public.trip_members where user_id = auth.uid()
    )
  );

-- Members of the same trip can read (needed for group profile computation)
create policy "quest_select_trip_member" on public.questionnaire_responses
  for select using (
    exists (
      select 1 from public.trip_members
      where trip_id = questionnaire_responses.trip_id and user_id = auth.uid()
    )
  );

create policy "quest_insert_own" on public.questionnaire_responses
  for insert with check (
    member_id in (
      select id from public.trip_members where user_id = auth.uid()
    )
  );

-- ============================================================
-- PROPOSALS
-- ============================================================
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  member_id uuid references public.trip_members(id) on delete cascade not null,
  url text not null,
  og_title text,
  og_image text,
  og_description text,
  og_price text,
  og_location text,
  created_at timestamptz default now() not null
);

alter table public.proposals enable row level security;

-- All trip members can see all proposals
create policy "proposals_select_trip" on public.proposals
  for select using (
    exists (
      select 1 from public.trip_members
      where trip_id = proposals.trip_id and user_id = auth.uid()
    )
  );

create policy "proposals_insert_own" on public.proposals
  for insert with check (
    member_id in (
      select id from public.trip_members where user_id = auth.uid()
    )
  );

create policy "proposals_delete_own" on public.proposals
  for delete using (
    member_id in (
      select id from public.trip_members where user_id = auth.uid()
    )
  );

-- Enforce max 3 proposals per member per trip
create or replace function public.check_proposal_limit()
returns trigger as $$
begin
  if (
    select count(*) from public.proposals
    where trip_id = new.trip_id and member_id = new.member_id
  ) >= 3 then
    raise exception 'Maximum 3 proposals per member';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_proposal_limit on public.proposals;
create trigger enforce_proposal_limit
  before insert on public.proposals
  for each row execute function public.check_proposal_limit();

-- ============================================================
-- VOTES
-- ============================================================
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals(id) on delete cascade not null,
  member_id uuid references public.trip_members(id) on delete cascade not null,
  trip_id uuid references public.trips(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (proposal_id, member_id)
);

alter table public.votes enable row level security;

-- Votes are ONLY readable after trip is revealed (anonymous until deadline)
create policy "votes_select_revealed" on public.votes
  for select using (
    exists (
      select 1 from public.trips
      where id = votes.trip_id and phase = 'revealed'
    )
  );

-- Members can see their own votes at any time (for UI state)
create policy "votes_select_own" on public.votes
  for select using (
    member_id in (
      select id from public.trip_members where user_id = auth.uid()
    )
  );

create policy "votes_insert_own" on public.votes
  for insert with check (
    member_id in (
      select id from public.trip_members where user_id = auth.uid()
    )
    and trip_id in (
      select trip_id from public.trip_members where user_id = auth.uid()
    )
  );

create policy "votes_delete_own" on public.votes
  for delete using (
    member_id in (
      select id from public.trip_members where user_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_trip_members_trip_id on public.trip_members(trip_id);
create index if not exists idx_trip_members_user_id on public.trip_members(user_id);
create index if not exists idx_proposals_trip_id on public.proposals(trip_id);
create index if not exists idx_votes_trip_id on public.votes(trip_id);
create index if not exists idx_votes_proposal_id on public.votes(proposal_id);
create index if not exists idx_quest_trip_id on public.questionnaire_responses(trip_id);
create index if not exists idx_trips_invite_token on public.trips(invite_token);
