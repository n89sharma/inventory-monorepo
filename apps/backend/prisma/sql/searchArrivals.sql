-- @param {String} $1:q
select
  a.id as id,
  a.arrival_number as arrival_number,
  o.name as vendor,
  w.city_code as warehouse_code,
  a.created_at as created_at
from "Arrival" a
  join "Organization" o on o.id = a.origin_id
  join "Warehouse" w on w.id = a.destination_id
where a.arrival_number like $1 || '%'
order by a.created_at desc
limit 3
