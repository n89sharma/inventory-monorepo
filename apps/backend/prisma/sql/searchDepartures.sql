-- @param {String} $1:q
select
  d.id as id,
  d.departure_number as departure_number,
  wo.city_code as origin_code,
  od.name as destination,
  d.created_at as created_at
from "Departure" d
  join "Warehouse" wo on wo.id = d.origin_id
  join "Organization" od on od.id = d.destination_id
where d.departure_number like $1 || '%'
order by d.created_at desc
limit 3
