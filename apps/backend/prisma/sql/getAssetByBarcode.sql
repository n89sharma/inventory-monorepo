select
  a.id as id,
  b."name" as brand,
  m."name" as model,
  at.asset_type as asset_type,
  a.barcode as barcode,
  a.serial_number as serial_number,
  t.meter_total as meter_total,
  w.city_code as warehouse_city_code,
  w.street as warehouse_street,
  tr.status as tracking_status,
  av.status as availability_status,
  te.status as technical_status,
  a.is_held as is_held
from "Asset" a
  join "TechnicalSpecification" t on t.asset_id = a.id
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "AssetType" at on at.id = m.asset_type_id
  join "TrackingStatus" tr on tr.id = a.tracking_status_id
  join "AvailabilityStatus" av on av.id = a.availability_status_id
  join "TechnicalStatus" te on te.id = a.technical_status_id
  left join "Location" l on l.id = a.location_id
  left join "Warehouse" w on w.id = l.warehouse_id
where a.barcode = $1
