select
  h.created_for_id                             as sales_rep_id,
  u."name"                                     as sales_rep_name,
  h.customer_id                                as customer_id,
  o."name"                                     as customer_name,
  (current_date - h.created_at::date)::int     as days_held,
  ha.held_asset_count                          as held_asset_count
from "Hold" h
join "User" u on u.id = h.created_for_id
join "Organization" o on o.id = h.customer_id
join lateral (
  select count(*)::int as held_asset_count
  from "Asset" a
  where a.hold_id = h.id
    and a.status_id = any($1::int[])
) ha on ha.held_asset_count > 0
where h.archived_at is null
