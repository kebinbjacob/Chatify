-- 1. Create profiles table (Keep existing)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  last_seen timestamptz default now(),
  
  constraint username_length check (char_length(username) >= 3)
);

-- 2. Create messages table (Simple structure)
drop table if exists public.reactions cascade;
drop table if exists public.messages cascade;
drop table if exists public.participants cascade;
drop table if exists public.conversations cascade;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id), -- null for global chat
  content text not null,
  image_url text,
  audio_url text,
  created_at timestamptz default now()
);

-- 3. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- 4. RLS Policies
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

create policy "Users can view their own messages."
  on messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id or receiver_id is null );

create policy "Users can insert messages."
  on messages for insert
  with check ( auth.uid() = sender_id );

-- 5. Storage Setup
insert into storage.buckets (id, name, public) 
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Public Access to Chat Images" on storage.objects for select using ( bucket_id = 'chat-images' );
create policy "Authenticated users can upload images" on storage.objects for insert with check ( bucket_id = 'chat-images' and auth.role() = 'authenticated' );

-- 6. Realtime Setup
alter table public.messages replica identity full;
drop publication if exists supabase_realtime;
create publication supabase_realtime for table messages, profiles;

-- 7. Auth Trigger for Profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, split_part(new.email, '@', 1), new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
