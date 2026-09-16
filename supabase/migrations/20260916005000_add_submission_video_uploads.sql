alter table public.bounty_submissions
add column if not exists video_url text not null default '',
add column if not exists video_path text not null default '',
add column if not exists video_name text not null default '',
add column if not exists video_type text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-videos',
  'submission-videos',
  true,
  524288000,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Submission videos are public readable" on storage.objects;
create policy "Submission videos are public readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'submission-videos');

drop policy if exists "Logged clients can upload submission videos" on storage.objects;
create policy "Logged clients can upload submission videos"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'submission-videos'
  and lower((storage.foldername(name))[1]) <> ''
);
