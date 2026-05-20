select
  a.id,
  b."name" as brand,
  m."name" as model,
  at.asset_type,
  a.barcode,
  a.serial_number,
  t.meter_total,
  w.city_code as warehouse_city_code,
  w.street as warehouse_street,
  av.status as availability_status,
  te.status as technical_status
from "Asset" a
  join "TechnicalSpecification" t on t.asset_id = a.id
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "AssetType" at on at.id = m.asset_type_id
  join "AvailabilityStatus" av on av.id = a.availability_status_id
  join "TechnicalStatus" te on te.id = a.technical_status_id
  left join "Location" l on l.id = a.location_id
  left join "Warehouse" w on w.id = l.warehouse_id
where m."name" ~* $1
  and (array_length($2::int[], 1) is null or av.id = any($2::int[]))
  and (array_length($3::int[], 1) is null or te.id = any($3::int[]))
  and (array_length($4::int[], 1) is null or w.id = any($4::int[]))
  and ($5 = -1 or t.meter_total <= $5)
