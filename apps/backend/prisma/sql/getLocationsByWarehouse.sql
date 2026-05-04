SELECT
  l.id,
  l.location,
  l.warehouse_id
FROM "Location" l
WHERE l.warehouse_id = $1
ORDER BY l.location ASC
