select
  a.id as id,
  b."name" as brand,
  m."name" as model,
  at.asset_type as asset_type,
  a.barcode as barcode,
  a.serial_number as serial_number,
  t.meter_total as meter_total,
  t.cassettes as cassettes,
  cmp."name" as internal_finisher,
  acc.accessories as accessories,
  m.weight as weight,
  m.size as size,
  l.warehouse_id as warehouse_id,
  w.city_code as warehouse_code,
  w.street as warehouse_street,
  z.zone as zone,
  l.bin as bin,
  s.status as status,
  rd.status as readiness,
  a.is_in_transit as is_in_transit,
  pi.invoice_number as purchase_invoice_number,
  si.invoice_number as sales_invoice_number,
  a.created_at as created_at,
  c.purchase_cost as cost_purchase_cost,
  c.transport_cost as cost_transport_cost,
  c.processing_cost as cost_processing_cost,
  c.other_cost as cost_other_cost,
  c.parts_cost as cost_parts_cost,
  c.total_cost as cost_total_cost,
  c.sale_price as cost_sale_price
from "Invoice" i
  join "Asset" a on (i.id = a.purchase_invoice_id or i.id = a.sales_invoice_id)
  join "TechnicalSpecification" t on t.asset_id = a.id
  left join "Component" cmp on cmp.id = t.component_id
  left join lateral (
    select coalesce(array_agg(ac.accessory order by ac.accessory), '{}') as accessories
    from "AssetAccessory" aa
      join "Accessory" ac on ac.id = aa.accessory_id
    where aa.asset_id = a.id
  ) acc on true
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "AssetType" at on at.id = m.asset_type_id
  join "Status" s on s.id = a.status_id
  join "Readiness" rd on rd.id = a.readiness_id
  left join "Location" l on l.id = a.location_id
  left join "Warehouse" w on w.id = l.warehouse_id
  left join "Zone" z on z.id = l.zone_id
  left join "Invoice" pi on pi.id = a.purchase_invoice_id
  left join "Invoice" si on si.id = a.sales_invoice_id
  left join "Cost" c on c.asset_id = a.id
where i.invoice_number  = $1
