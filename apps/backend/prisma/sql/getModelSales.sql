-- @param {Int} $1:modelId
-- @param {DateTime} $2:fromDate
-- @param {Int} $3:soldStatusId
select
  a.barcode as barcode,
  d.created_at as departed_at,
  c.sale_price::float8 as sale_price,
  ts.meter_total as meter,
  o."name" as customer,
  u."name" as salesperson,
  ts.cassettes as cassettes,
  cmp."name" as internal_finisher,
  acc.core_functions as core_functions
from "Asset" a
  join "Departure" d on d.id = a.departure_id
  join "Cost" c on c.asset_id = a.id
  join "Organization" o on o.id = d.destination_id
  left join "User" u on u.id = d.sales_representative_id
  left join "TechnicalSpecification" ts on ts.asset_id = a.id
  left join "Component" cmp on cmp.id = ts.component_id
  left join lateral (
    select coalesce(array_agg(ac.accessory order by ac.accessory), '{}') as core_functions
    from "AssetAccessory" aa
      join "Accessory" ac on ac.id = aa.accessory_id
    where aa.asset_id = a.id
  ) acc on true
where a.model_id = $1
  and a.status_id = $3
  and c.sale_price is not null
  and d.created_at >= $2
order by d.created_at desc
