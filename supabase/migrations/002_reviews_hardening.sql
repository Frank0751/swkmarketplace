-- ─── 002: Review integrity + vendor rating aggregates ─────────────────────────

-- Only verified purchases can be reviewed: the review's order must belong to
-- the buyer, be for the same product, and have delivery confirmed
drop policy if exists "reviews_insert_buyer" on public.product_reviews;
create policy "reviews_insert_buyer" on public.product_reviews for insert with check (
  buyer_id = auth.uid()
  and exists (
    select 1 from public.orders o
    where o.id = product_reviews.order_id
      and o.buyer_id = auth.uid()
      and o.product_id = product_reviews.product_id
      and o.status in ('delivered', 'released')
  )
);

-- Keep vendor_profiles.rating / review_count in sync with product_reviews
create or replace function refresh_vendor_rating()
returns trigger as $$
declare
  target_product_id uuid;
  target_vendor_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  select vendor_id into target_vendor_id
  from public.products
  where id = target_product_id;

  if target_vendor_id is not null then
    update public.vendor_profiles vp
    set rating = coalesce((
          select round(avg(pr.rating)::numeric, 2)
          from public.product_reviews pr
          join public.products p on p.id = pr.product_id
          where p.vendor_id = target_vendor_id
        ), 0),
        review_count = (
          select count(*)
          from public.product_reviews pr
          join public.products p on p.id = pr.product_id
          where p.vendor_id = target_vendor_id
        )
    where vp.id = target_vendor_id;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists reviews_refresh_vendor_rating on public.product_reviews;
create trigger reviews_refresh_vendor_rating
  after insert or update or delete on public.product_reviews
  for each row execute function refresh_vendor_rating();
