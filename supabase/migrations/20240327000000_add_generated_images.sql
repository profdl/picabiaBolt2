create table generated_images (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  image_url text not null,
  prompt text not null,
  aspect_ratio text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table generated_images enable row level security;

create policy "Users can view own generated images" on generated_images
  for select using (auth.uid() = user_id);

create policy "Users can insert own generated images" on generated_images
  for insert with check (auth.uid() = user_id);

-- Add index for faster queries
create index generated_images_user_id_created_at_idx on generated_images(user_id, created_at desc);
