select
  a.barcode as barcode,
  a.serial_number as serial_number,
  m."name" as model,
  b."name" as brand,
  at.asset_type as asset_type,
  tr.status  as tracking_status,
  av.status  as availability_status,
  te.status  as technical_status,
  w.city_code as location_city_code,
  w.street as location_street,
  l.location as location,
  a.created_at as created_at,
  a.is_held as is_held,
  -- cost
  c.purchase_cost as purchase_cost,
  c.transport_cost as transport_cost,
  c.processing_cost as processing_cost,
  c.other_cost as other_cost,
  c.parts_cost as parts_cost,
  c.total_cost as total_cost,
  c.sale_price as sale_price,
  -- technical spec
  ts.cassettes as ts_cassettes,
  ts.internal_finisher as internal_finisher,
  ts.meter_black as meter_black,
  ts.meter_colour as meter_colour,
  ts.drum_life_c as drum_life_c,
  ts.drum_life_m as drum_life_m,
  ts.drum_life_y as drum_life_y,
  ts.drum_life_k as drum_life_k,
  -- hold
  hub.email as hold_by_email,
  hub."name" as hold_by_name,
  huf.email as hold_for_email,
  huf."name" as hold_for_name,
  h.created_at as hold_created_at,
  ho."name" as hold_customer,
  h.from_dt as hold_from,
  h.to_dt as hold_to,
  h.notes as hold_notes,
  h.hold_number as hold_number,
  -- arrival
  r.arrival_number as arrival_number,
  rc."name" as arrival_origin,
  rw.city_code as arrival_destination_city_code,
  rw.street as arrival_destination_street,
  rt."name" as arrival_transporter,
  ru.email as arrival_created_by_email,
  ru."name" as arrival_created_by_name,
  r.notes as arrival_notes,
  r.created_at as arrival_created_at,
  -- departure
  d.departure_number as departure_number,
  dw.city_code as departure_origin_city_code,
  dw.street as departure_origin_street,
  dc."name" as departure_destination,
  dt."name" as departure_transporter,
  du.email as departure_created_by_email,
  du."name" as departure_created_by_name,
  d.notes as departure_notes,
  d.created_at as departure_created_at,
  -- invoice
  pi.invoice_number as purchase_invoice_number,
  pi.is_cleared as purchase_invoice_is_cleared
from "Asset" a
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "AssetType" at on at.id = m.asset_type_id
  join "TrackingStatus" tr on tr.id = a.tracking_status_id
  join "AvailabilityStatus" av on av.id = a.availability_status_id
  join "TechnicalStatus" te on te.id = a.technical_status_id
  left join "Cost" c on c.asset_id = a.id
  left join "TechnicalSpecification" ts on ts.asset_id = a.id
  left join "Location" l on l.id = a.location_id
  left join "Warehouse" w on w.id = l.warehouse_id
  left join "Hold" h on h.id = a.hold_id
  left join "User" hub on hub.id = h.created_by_id
  left join "User" huf on huf.id = h.created_for_id
  left join "Organization" ho on ho.id = h.customer_id
  left join "Arrival" r on r.id = a.arrival_id
  left join "User" ru on ru.id = r.created_by_id
  left join "Organization" rc on rc.id = r.origin_id
  left join "Organization" rt on rt.id = r.transporter_id
  left join "Warehouse" rw on rw.id = r.destination_id
  left join "Departure" d on d.id = a.departure_id
  left join "User" du on du.id = d.created_by_id
  left join "Warehouse" dw on dw.id = d.origin_id
  left join "Organization" dt on dt.id = d.transporter_id
  left join "Organization" dc on dc.id = d.destination_id
  left join "Invoice" pi on pi.id = a.purchase_invoice_id
where a.barcode = $1