select
  dep.origin_id                                  as warehouse_id,
  w.city_code                                    as warehouse_code,
  dep.sales_representative_id                    as sales_rep_id,
  u."name"                                       as sales_rep_name,
  org.id                                         as vendor_id,
  org."name"                                     as vendor_name,
  b.id                                            as brand_id,
  b."name"                                        as brand_name,
  extract(month from dep.created_at)::int        as month,
  count(*)::int                                  as asset_count,
  coalesce(sum(c.sale_price), 0)::float8                     as gross_revenue,
  coalesce(sum(c.purchase_cost), 0)::float8                  as cogs_base,
  coalesce(sum(c.total_cost), 0)::float8                     as cogs_total,
  coalesce(sum(c.transport_cost), 0)::float8                 as freight_cost,
  coalesce(sum(c.sale_price - c.purchase_cost), 0)::float8   as gross_margin_base,
  coalesce(sum(c.sale_price - c.total_cost), 0)::float8      as gross_margin
from "Asset" a
join "Cost" c on c.asset_id = a.id
join "Departure" dep on dep.id = a.departure_id
join "Warehouse" w on w.id = dep.origin_id
join "Model" m on m.id = a.model_id
join "Brand" b on b.id = m.brand_id
left join "User" u on u.id = dep.sales_representative_id
left join "Arrival" arr on arr.id = a.arrival_id
left join "Organization" org on org.id = arr.origin_id
where extract(year from dep.created_at)::int = $1
  and c.purchase_cost is not null
  and c.transport_cost is not null
  and c.total_cost is not null
  and c.sale_price is not null
group by
  dep.origin_id,
  w.city_code,
  dep.sales_representative_id,
  u."name",
  org.id,
  org."name",
  b.id,
  b."name",
  extract(month from dep.created_at)
order by month
