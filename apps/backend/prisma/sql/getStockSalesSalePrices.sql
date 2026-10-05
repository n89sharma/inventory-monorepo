-- @param {Int} $1:soldStatusId
-- @param {String} $2:salesFrom
-- Filters mirror getModelPriceHistory.sql; meter-band thresholds mirror getStockSales.sql.
select
  b.id                             as brand_id,
  b."name"                         as brand_name,
  t.id                             as asset_type_id,
  t.asset_type                     as asset_type,
  m.id                             as model_id,
  m."name"                         as model_name,
  case
    when h.meter_total is null   then 'UNKNOWN'
    when h.meter_total < 70000   then 'LOW'
    when h.meter_total < 210000  then 'MEDIUM'
    else 'HIGH'
  end                              as meter_band,
  array_agg(c.sale_price::float8)  as sale_prices
from "Asset" a
join "Departure" d on d.id = a.departure_id
join "Cost" c      on c.asset_id = a.id
join "Model" m     on m.id = a.model_id
join "AssetType" t on t.id = m.asset_type_id
join "Brand" b     on b.id = m.brand_id
left join "TechnicalSpecification" h on h.asset_id = a.id
where a.status_id = $1
  and c.sale_price is not null
  and coalesce(d.departure_date, d.created_at::date) >= $2::date
group by b.id, b."name", t.id, t.asset_type, m.id, m."name", meter_band
