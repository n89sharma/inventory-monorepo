-- @param {String} $1:modelPattern
-- @param {Int} $2:trackingStatus
-- @param {Int} $3:availabilityStatus
-- @param {Int} $4:technicalStatus
-- @param {Int} $5:warehouse
-- @param {BigInt} $6:meter
select
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
  te.status as technical_status
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
where m."name"
~* $1
  AND
($2 = 0 or tr.id = $2)
  AND
($3 = 0 or av.id = $3)
  AND
($4 = 0 or te.id = $4)
  AND
($5 = 0 or w.id = $5)
  AND
($6 = -1 or t.meter_total <= $6)