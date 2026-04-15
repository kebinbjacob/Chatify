-- 1. Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  last_seen timestamptz default now(),
  
  constraint username_length check (char_length(username) >= 3)
);

-- 2. Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade, -- Null for global chat
  content text,
  image_url text,
  created_at timestamptz default now(),
  
  constraint content_or_image check (content is not null or image_url is not null)
);

-- 3. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- 4. Create policies for profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 5. Create policies for messages
create policy "Messages are viewable by participants."
  on messages for select
  using (
    receiver_id is null or 
    auth.uid() = user_id or 
    auth.uid() = receiver_id
  );

create policy "Authenticated users can insert their own messages."
  on messages for insert
  with check ( auth.uid() = user_id );

-- 6. Storage Setup for Images
insert into storage.buckets (id, name, public) 
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Public Access to Chat Images"
  on storage.objects for select
  using ( bucket_id = 'chat-images' );

create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'chat-images' and auth.role() = 'authenticated' );

-- 1. Update messages table with audio_url
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='messages' and column_name='audio_url') then
    alter table public.messages add column audio_url text;
  end if;

  -- Update constraint: Allow message to be content, image, OR audio
  alter table public.messages drop constraint if exists content_or_image;
  alter table public.messages add constraint content_or_media check (content is not null or image_url is not null or audio_url is not null);
end $$;

-- 2. Update policies for messages (Strictly DMs)
drop policy if exists "Messages are viewable by participants." on messages;

create policy "Messages are viewable by participants."
  on messages for select
  using (
    auth.uid() = user_id or 
    auth.uid() = receiver_id
  );

-- Note: We are removing 'receiver_id is null' from the select policy 
-- to effectively disable global chat at the database level.

-- 2. Create reactions table
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  
  unique(message_id, user_id, emoji)
);

-- 3. Enable RLS for reactions
alter table public.reactions enable row level security;

-- 4. Create policies for reactions
drop policy if exists "Reactions are viewable by everyone." on reactions;
create policy "Reactions are viewable by everyone."
  on reactions for select
  using ( true );

drop policy if exists "Authenticated users can add reactions." on reactions;
create policy "Authenticated users can add reactions."
  on reactions for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can remove their own reactions." on reactions;
create policy "Users can remove their own reactions."
  on reactions for delete
  using ( auth.uid() = user_id );

-- 5. Enable Realtime for reactions
alter publication supabase_realtime add table reactions;
-- Note: This is optional but recommended. If you don't use this, 
-- the app will attempt to create the profile on first login.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, split_part(new.email, '@', 1), new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Enable Realtime for messages
alter table public.messages replica identity full;
alter publication supabase_realtime add table messages;
