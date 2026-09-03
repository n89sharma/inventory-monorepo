-- Monthly profitability cube for a single departure year ($1), grouped on
-- (warehouse x sales rep x vendor x customer x brand x month).
-- Ids only: labels are resolved from the catalogs the frontend already caches, so the
-- Warehouse / User / Organization / Brand joins are unnecessary. Every FK below is
-- non-null, so reading dep.destination_id, arr.origin_id and m.brand_id directly is
-- row-for-row identical to joining those tables for their ids.
select
  dep.origin_id                                             as warehouse_id,
  dep.sales_representative_id                               as sales_rep_id,
  arr.origin_id                                             as vendor_id,
  dep.destination_id                                        as customer_id,
  m.brand_id                                                as brand_id,
  extract(month from dep.created_at)::int                   as month,
  count(*)::int                                             as asset_count,

  coalesce(sum(coalesce(c.total_cost, 0)), 0)::float8              as cogs,
  coalesce(sum(c.sale_price), 0)::float8                          as gross_revenue,
  coalesce(sum(c.sale_price - coalesce(c.total_cost, 0)), 0)::float8 as gross_margin

from "Asset" a
join "Cost" c on c.asset_id = a.id
join "Departure" dep on dep.id = a.departure_id
join "Model" m on m.id = a.model_id
left join "Arrival" arr on arr.id = a.arrival_id
-- A sale price is the only thing an asset needs to count. Costs are not required to be
-- present or non-zero: an asset sold against no recorded cost is a real 100% margin, and
-- excluding it understated revenue. A null cost is read as zero inside the sums so revenue
-- and margin stay reconcilable rather than the row being dropped from one and not the other.
where extract(year from dep.created_at)::int = $1
  and c.sale_price is not null and c.sale_price > 0
group by
  dep.origin_id,
  dep.sales_representative_id,
  arr.origin_id,
  dep.destination_id,
  m.brand_id,
  extract(month from dep.created_at)
order by month
