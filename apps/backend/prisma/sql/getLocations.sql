select
  l.id as id,
  w.city_code as warehouse_code,
  w.street as warehouse_street,
  z.zone as zone,
  l.bin as bin
from "Location" l
  join "Warehouse" w on w.id = l.warehouse_id
  join "Zone" z on z.id = l.zone_id
order by w.city_code asc, z.zone asc, l.bin asc
