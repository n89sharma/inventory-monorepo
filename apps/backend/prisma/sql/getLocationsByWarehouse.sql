SELECT
  l.id,
  l.warehouse_id,
  l.zone_id,
  z.zone,
  l.bin
FROM "Location" l
  JOIN "Zone" z ON z.id = l.zone_id
WHERE l.warehouse_id = $1
ORDER BY z.zone ASC, l.bin ASC
