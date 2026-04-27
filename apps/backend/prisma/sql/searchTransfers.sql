-- @param {String} $1:q
select
  t.id as id,
  t.transfer_number as transfer_number,
  wo.city_code as origin_code,
  wd.city_code as destination_code,
  t.created_at as created_at
from "Transfer" t
  join "Warehouse" wo on wo.id = t.origin_id
  join "Warehouse" wd on wd.id = t.destination_id
where t.transfer_number like $1 || '%'
order by t.created_at desc
limit 3
