-- $1 = on-hand status names, $2 = warehouse ids. An in-transit asset has no location, so it
-- belongs to the destination of its open transfer.
select
  coalesce(l.warehouse_id, tr.destination_id) as warehouse_id,
  w.city_code as city_code,
  a.is_in_transit as is_in_transit,
  a.barcode as barcode,
  b."name" as brand_name,
  b.name_normalized as brand_name_normalized,
  m."name" as model_name,
  at.asset_type as asset_type,
  a.serial_number as serial_number,
  t.meter_total as meter_total,
  c.purchase_cost as purchase_cost,
  c.transport_cost as transport_cost,
  c.transfer_cost as transfer_cost,
  c.processing_cost as processing_cost,
  c.other_cost as other_cost,
  c.parts_cost as parts_cost,
  c.total_cost as total_cost,
  r.created_at as stock_date,
  ro."name" as vendor_name,
  acc.accessories as accessories,
  t.cassettes as cassettes,
  rd.status as readiness,
  s.status as status,
  h.hold_number as hold_number,
  r.arrival_number as arrival_number,
  pi.invoice_number as purchase_invoice_number,
  tr.transfer_number as transfer_number
from "Asset" a
  join "Status" s on s.id = a.status_id
  join "Readiness" rd on rd.id = a.readiness_id
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "AssetType" at on at.id = m.asset_type_id
  left join "TechnicalSpecification" t on t.asset_id = a.id
  left join "Cost" c on c.asset_id = a.id
  left join "Location" l on l.id = a.location_id
  left join lateral (
    select tf.transfer_number, tf.destination_id
    from "AssetTransfer" atf
      join "Transfer" tf on tf.id = atf.transfer_id
    where atf.asset_id = a.id
      and tf.status = 'IN_TRANSIT'
    limit 1
  ) tr on true
  join "Warehouse" w on w.id = coalesce(l.warehouse_id, tr.destination_id)
  left join lateral (
    select coalesce(array_agg(ac.accessory order by ac.accessory), '{}') as accessories
    from "AssetAccessory" aa
      join "Accessory" ac on ac.id = aa.accessory_id
    where aa.asset_id = a.id
  ) acc on true
  left join "Hold" h on h.id = a.hold_id
  left join "Arrival" r on r.id = a.arrival_id
  left join "Organization" ro on ro.id = r.origin_id
  left join "Invoice" pi on pi.id = a.purchase_invoice_id
where s.status = any($1::text[])
  and w.id = any($2::int[])
order by w.city_code, a.barcode
