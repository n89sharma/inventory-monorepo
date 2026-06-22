select
  a.id as id,
  b."name" as brand,
  m."name" as model,
  at.asset_type as asset_type,
  a.barcode as barcode,
  a.serial_number as serial_number,
  s.meter_total as meter_total,
  m.weight as weight,
  m.size as size,
  w.city_code as warehouse_code,
  w.street as warehouse_street,
  z.zone as zone,
  l.bin as bin,
  st.status as status,
  rd.status as readiness,
  a.is_in_transit as is_in_transit,
  pi.invoice_number as purchase_invoice_number,
  si.invoice_number as sales_invoice_number
from "AssetTransfer" tt
  join "Transfer" t on t.id = tt.transfer_id
  join "Asset" a on a.id = tt.asset_id
  join "TechnicalSpecification" s on s.asset_id = a.id
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "AssetType" at on at.id = m.asset_type_id
  join "Status" st on st.id = a.status_id
  join "Readiness" rd on rd.id = a.readiness_id
  left join "Location" l on l.id = a.location_id
  left join "Warehouse" w on w.id = l.warehouse_id
  left join "Zone" z on z.id = l.zone_id
  left join "Invoice" pi on pi.id = a.purchase_invoice_id
  left join "Invoice" si on si.id = a.sales_invoice_id
where t.transfer_number = $1
