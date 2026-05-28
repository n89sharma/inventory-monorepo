select
  a.id,
  b."name" as brand,
  m."name" as model,
  at.asset_type,
  a.barcode,
  a.serial_number,
  t.meter_total,
  t.cassettes,
  t.internal_finisher,
  w.city_code as warehouse_code,
  w.street as warehouse_street,
  z.zone as zone,
  l.bin as bin,
  s.status as status,
  rd.status as readiness,
  a.is_in_transit as is_in_transit,
  pi.invoice_number as purchase_invoice_number,
  h.hold_number as hold_number,
  hu."name" as held_by,
  lc.comment as latest_comment,
  lc.created_at as latest_comment_at,
  lcu."name" as latest_comment_by
from "Asset" a
  join "TechnicalSpecification" t on t.asset_id = a.id
  join "Model" m on m.id = a.model_id
  join "Brand" b on b.id = m.brand_id
  join "AssetType" at on at.id = m.asset_type_id
  join "Status" s on s.id = a.status_id
  join "Readiness" rd on rd.id = a.readiness_id
  left join "Location" l on l.id = a.location_id
  left join "Warehouse" w on w.id = l.warehouse_id
  left join "Zone" z on z.id = l.zone_id
  left join "Invoice" pi on pi.id = a.purchase_invoice_id
  left join "Hold" h on h.id = a.hold_id
  left join "User" hu on hu.id = h.created_by_id
  left join lateral (
    select c.comment, c.created_at, c.created_by_id
    from "Comment" c
    where c.asset_id = a.id
    order by c.created_at desc
    limit 1
  ) lc on true
  left join "User" lcu on lcu.id = lc.created_by_id
where m."name" ~* $1
  and (array_length($2::int[], 1) is null or s.id = any($2::int[]))
  and (array_length($3::int[], 1) is null or rd.id = any($3::int[]))
  and (array_length($4::int[], 1) is null or w.id = any($4::int[]))
  and ($5 = -1 or t.meter_total >= $5)
  and ($6 = -1 or t.meter_total <= $6)
  and ($7 = -1 or t.cassettes >= $7)
  and ($8 = '' or t.internal_finisher ~* $8)
