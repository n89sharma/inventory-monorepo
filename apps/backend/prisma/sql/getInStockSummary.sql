-- $1 = IN_STOCK status ids. Meter-band thresholds mirror METER_BANDS
-- (apps/frontend/src/lib/model-price-history-summary.ts): max is exclusive.
select
  w.id                          as warehouse_id,
  b.id                          as brand_id,
  b."name"                      as brand_name,
  t.id                          as asset_type_id,
  t.asset_type                  as asset_type,
  m.id                          as model_id,
  m."name"                      as model_name,
  case
    when h.meter_total is null   then 'UNKNOWN'
    when h.meter_total < 70000   then 'LOW'
    when h.meter_total < 210000  then 'MEDIUM'
    else 'HIGH'
  end                           as meter_band,
  sum(c.purchase_cost)::float8  as purchase_cost_sum,
  count(c.purchase_cost)::int   as purchase_cost_count,
  sum(c.total_cost)::float8     as total_cost_sum,
  count(c.total_cost)::int      as total_cost_count,
  count(*)::int                 as asset_count
from "Asset" a
join "Status" s    on s.id = a.status_id and s.id = any($1::int[])
join "Model" m     on m.id = a.model_id
join "AssetType" t on t.id = m.asset_type_id
join "Brand" b     on b.id = m.brand_id
join "Location" l  on l.id = a.location_id
join "Warehouse" w on w.id = l.warehouse_id and w.is_active is true
left join "Cost" c                   on c.asset_id = a.id
left join "TechnicalSpecification" h on h.asset_id = a.id
group by w.id, b.id, b."name", t.id, t.asset_type, m.id, m."name", meter_band
order by count(*) desc, w.id, b."name", t.asset_type, m."name"
