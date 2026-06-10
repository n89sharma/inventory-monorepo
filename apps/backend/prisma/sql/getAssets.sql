select
  a.id,
  b."name" as brand,
  m."name" as model,
  at.asset_type,
  a.barcode,
  a.serial_number,
  s.status as status,
  rd.status as readiness,
  a.is_in_transit as is_in_transit,
  co."name" as country_of_origin,
  a.manufactured_year as manufactured_year,
  w.city_code as warehouse_code,
  w.street as warehouse_street,
  z.zone as zone,
  l.bin as bin,
  t.meter_total as specs_meter_total,
  t.cassettes as specs_cassettes,
  cmp."name" as specs_internal_finisher,
  t.toner_life_c as specs_toner_life_c,
  t.toner_life_m as specs_toner_life_m,
  t.toner_life_y as specs_toner_life_y,
  t.toner_life_k as specs_toner_life_k,
  c.purchase_cost as cost_purchase_cost,
  c.total_cost as cost_total_cost,
  c.sale_price as cost_sale_price,
  h.hold_number as hold_hold_number,
  hu."name" as held_by,
  hu2."name" as hold_created_for,
  hc."name" as hold_customer,
  h.created_at as hold_created_at,
  ro."name" as vendor,
  do_."name" as customer,
  d.created_at as departed_at,
  r.created_at as arrival_created_at,
  pi.invoice_number as purchase_invoice_invoice_number,
  lc.comment as latest_comment,
  lc.created_at as latest_comment_at,
  lcu."name" as latest_comment_by
from "Asset" a
  join "TechnicalSpecification" t on t.asset_id = a.id
  left join "Component" cmp on cmp.id = t.component_id
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "AssetType" at on at.id = m.asset_type_id
  join "Status" s on s.id = a.status_id
  join "Readiness" rd on rd.id = a.readiness_id
  left join "Cost" c on c.asset_id = a.id
  left join "Country" co on co.id = a.country_of_origin_id
  left join "Location" l on l.id = a.location_id
  left join "Warehouse" w on w.id = l.warehouse_id
  left join "Zone" z on z.id = l.zone_id
  left join "Invoice" pi on pi.id = a.purchase_invoice_id
  left join "Hold" h on h.id = a.hold_id
  left join "User" hu on hu.id = h.created_by_id
  left join "User" hu2 on hu2.id = h.created_for_id
  left join "Organization" hc on hc.id = h.customer_id
  left join "Arrival" r on r.id = a.arrival_id
  left join "Organization" ro on ro.id = r.origin_id
  left join "Departure" d on d.id = a.departure_id
  left join "Organization" do_ on do_.id = d.destination_id
  left join lateral (
    select cm.comment, cm.created_at, cm.created_by_id
    from "Comment" cm
    where cm.asset_id = a.id
    order by cm.created_at desc
    limit 1
  ) lc on true
  left join "User" lcu on lcu.id = lc.created_by_id
where ($1 = '' or m."name" ~* $1)
  and (array_length($2::int[], 1) is null or s.id = any($2::int[]))
  and (array_length($3::int[], 1) is null or rd.id = any($3::int[]))
  and (array_length($4::int[], 1) is null or w.id = any($4::int[]))
  and ($5 = -1 or t.meter_total >= $5)
  and ($6 = -1 or t.meter_total <= $6)
  and ($7 = -1 or t.cassettes >= $7)
  and ($8 = -1 or cmp.id = $8)
  and (array_length($9::int[], 1) is null or b.id = any($9::int[]))
  and (array_length($10::int[], 1) is null or at.id = any($10::int[]))
