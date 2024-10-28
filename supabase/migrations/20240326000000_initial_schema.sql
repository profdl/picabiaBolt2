-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create projects table
create table public.projects (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    shapes jsonb default '[]'::jsonb not null,
    thumbnail text
);

-- Set up Row Level Security (RLS)
alter table public.projects enable row level security;

-- Create policies
create policy "Users can view own projects" on projects for select
    using (auth.uid() = user_id);

create policy "Users can create own projects" on projects for insert
    with check (auth.uid() = user_id);

create policy "Users can update own projects" on projects for update
    using (auth.uid() = user_id);

create policy "Users can delete own projects" on projects for delete
    using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger set_updated_at
    before update on projects
    for each row
    execute function handle_updated_at();

-- Create indexes
create index projects_user_id_idx on projects(user_id);
create index projects_updated_at_idx on projects(updated_at desc);