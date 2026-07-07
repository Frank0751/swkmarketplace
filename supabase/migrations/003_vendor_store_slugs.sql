-- ─── 003: Vendor store slugs + mini-website fields ─────────────────────────────

-- Shareable store URL: marketplace.swkghana.org/store/[slug]
alter table public.vendor_profiles
  add column if not exists slug          text unique,
  add column if not exists story         text,
  add column if not exists founders      jsonb not null default '[]'::jsonb,
  add column if not exists year_founded  integer,
  add column if not exists team_size     integer,
  add column if not exists website       text;

create index if not exists vendor_profiles_slug_idx on public.vendor_profiles(slug);

-- Slugify helper: "Adom Organics & Co." -> "adom-organics-co"
create or replace function slugify(input text)
returns text as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$ language sql immutable;

-- Auto-generate a unique slug from business_name on insert, or when the
-- business is renamed (slug follows the name unless manually set)
create or replace function generate_vendor_slug()
returns trigger as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 1;
begin
  if new.slug is not null
     and (tg_op = 'INSERT' or new.slug is distinct from old.slug) then
    -- caller supplied an explicit slug: normalise it but respect it
    new.slug := slugify(new.slug);
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.business_name is not distinct from old.business_name
     and old.slug is not null then
    return new; -- name unchanged, keep existing slug
  end if;

  base_slug := slugify(new.business_name);
  if base_slug = '' then
    base_slug := 'store';
  end if;

  candidate := base_slug;
  while exists (
    select 1 from public.vendor_profiles
    where slug = candidate and id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end;
$$ language plpgsql;

drop trigger if exists vendor_profiles_slug on public.vendor_profiles;
create trigger vendor_profiles_slug
  before insert or update on public.vendor_profiles
  for each row execute function generate_vendor_slug();

-- Backfill existing vendors
update public.vendor_profiles set slug = null where slug is null;
