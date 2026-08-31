-- @param {String} $1:serialNormalized
-- @param {String} $2:excludeBarcode the asset being edited, or '' when nothing is excluded
-- @param {String} $3:allowedStatus the one status a duplicate may be created against
select
  a.barcode,
  a.serial_number,
  b."name" as brand,
  m."name" as model,
  s.status as status,
  w.city_code as warehouse_code,
  r.arrival_number as arrival_number,
  d.departure_number as departure_number,
  d.created_at as departed_at,
  count(*) over () as total_match_count,
  count(*) filter (where s.status <> $3) over () as blocking_match_count
from "Asset" a
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "Status" s on s.id = a.status_id
  left join "Location" l on l.id = a.location_id
  left join "Warehouse" w on w.id = l.warehouse_id
  left join "Arrival" r on r.id = a.arrival_id
  left join "Departure" d on d.id = a.departure_id
where a.serial_normalized = $1
  and a.barcode <> $2
order by (s.status <> $3) desc, a.created_at desc
limit 3
