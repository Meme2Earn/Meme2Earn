-- Remove profile bio now that Meme2Earn uses X username and avatar only.
alter table public.profiles
drop column if exists bio;
