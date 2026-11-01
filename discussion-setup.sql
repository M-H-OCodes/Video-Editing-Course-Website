-- Shared discussion setup (optional) - run ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- Afterwards put your Project URL and anon key in public/discussion-config.js.
--
-- Security model: the table is locked (RLS on, no direct access for the public key). Visitors can
-- only use the four functions below. Each browser holds a random secret token; only a hash of it
-- is stored, so people can edit/delete only the comments written from their own browser.

create table if not exists public.discussion_comments (
  id          uuid primary key default gen_random_uuid(),
  username    text not null check (char_length(username) between 1 and 40),
  body        text not null check (char_length(body) between 1 and 3000),
  parent_id   uuid references public.discussion_comments(id) on delete cascade,
  owner_hash  text not null,
  created_at  timestamptz not null default now()
);

alter table public.discussion_comments enable row level security;
revoke all on public.discussion_comments from anon, authenticated;
-- (No policies on purpose: nothing can touch the table except through the functions below.)

create or replace function public.discussion_list(p_token text default '')
returns table (id uuid, username text, body text, parent_id uuid, created_at timestamptz, mine boolean)
language sql stable security definer set search_path = public
as $$
  select c.id, c.username, c.body, c.parent_id, c.created_at,
         (coalesce(p_token, '') <> ''
          and c.owner_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex')) as mine
  from public.discussion_comments c
  order by c.created_at desc
  limit 500;
$$;

create or replace function public.discussion_post(p_name text, p_text text, p_parent uuid, p_token text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Please enter your display name to comment.';
  end if;
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Comment text cannot be empty.';
  end if;
  if char_length(coalesce(p_token, '')) < 16 then
    raise exception 'Invalid session. Please refresh the page.';
  end if;
  if p_parent is not null
     and not exists (select 1 from public.discussion_comments where id = p_parent) then
    raise exception 'The comment you are replying to no longer exists.';
  end if;

  insert into public.discussion_comments (username, body, parent_id, owner_hash)
  values (left(btrim(p_name), 40), left(btrim(p_text), 3000), p_parent,
          encode(sha256(convert_to(p_token, 'utf8')), 'hex'))
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.discussion_edit(p_id uuid, p_text text, p_token text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(btrim(p_text), '') = '' then
    raise exception 'Comment text cannot be empty.';
  end if;

  update public.discussion_comments
     set body = left(btrim(p_text), 3000)
   where id = p_id
     and owner_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex');

  if not found then
    raise exception 'You can only edit your own comments.';
  end if;
end;
$$;

create or replace function public.discussion_delete(p_id uuid, p_token text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.discussion_comments
   where id = p_id
     and owner_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex');

  if not found then
    raise exception 'You can only delete your own comments.';
  end if;
end;
$$;

revoke all on function public.discussion_list(text)                    from public;
revoke all on function public.discussion_post(text, text, uuid, text)  from public;
revoke all on function public.discussion_edit(uuid, text, text)        from public;
revoke all on function public.discussion_delete(uuid, text)            from public;

grant execute on function public.discussion_list(text)                   to anon, authenticated;
grant execute on function public.discussion_post(text, text, uuid, text) to anon, authenticated;
grant execute on function public.discussion_edit(uuid, text, text)       to anon, authenticated;
grant execute on function public.discussion_delete(uuid, text)           to anon, authenticated;
