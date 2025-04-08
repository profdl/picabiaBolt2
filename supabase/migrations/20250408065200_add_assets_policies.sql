-- Enable RLS for assets table if not already enabled
alter table if exists public.assets enable row level security;

-- Create policies for the assets table if they don't exist
do $$
begin
  if not exists (select from pg_policies where policyname = 'Users can view own assets' and tablename = 'assets') then
    create policy "Users can view own assets"
      on assets for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select from pg_policies where policyname = 'Users can insert own assets' and tablename = 'assets') then
    create policy "Users can insert own assets"
      on assets for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select from pg_policies where policyname = 'Users can update own assets' and tablename = 'assets') then
    create policy "Users can update own assets"
      on assets for update
      using (auth.uid() = user_id);
  end if;

  if not exists (select from pg_policies where policyname = 'Users can delete own assets' and tablename = 'assets') then
    create policy "Users can delete own assets"
      on assets for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

-- Add storage bucket policies if they don't exist
do $$
begin
  if not exists (select from pg_policies where policyname = 'Users can upload to assets bucket' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can upload to assets bucket"
      on storage.objects for insert
      with check (
        bucket_id = 'assets' AND
        auth.uid() = owner
      );
  end if;

  if not exists (select from pg_policies where policyname = 'Users can read from assets bucket' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can read from assets bucket"
      on storage.objects for select
      using (bucket_id = 'assets');
  end if;

  if not exists (select from pg_policies where policyname = 'Users can update their own objects in assets bucket' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can update their own objects in assets bucket"
      on storage.objects for update
      using (
        bucket_id = 'assets' AND
        auth.uid() = owner
      );
  end if;

  if not exists (select from pg_policies where policyname = 'Users can delete their own objects in assets bucket' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can delete their own objects in assets bucket"
      on storage.objects for delete
      using (
        bucket_id = 'assets' AND
        auth.uid() = owner
      );
  end if;
end
$$; 