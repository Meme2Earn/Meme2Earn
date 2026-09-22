insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bounty-images',
  'bounty-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Bounty images are public readable" on storage.objects;
create policy "Bounty images are public readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'bounty-images');

drop policy if exists "Logged clients can upload bounty images" on storage.objects;
create policy "Logged clients can upload bounty images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'bounty-images'
  and lower((storage.foldername(name))[1]) <> ''
);
