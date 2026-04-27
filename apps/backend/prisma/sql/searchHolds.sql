-- @param {String} $1:q
select
  h.id as id,
  h.hold_number as hold_number,
  c.name as customer,
  uf.name as created_for,
  h.created_at as created_at
from "Hold" h
  join "Organization" c on c.id = h.customer_id
  join "User" uf on uf.id = h.created_for_id
where h.hold_number like $1 || '%'
order by h.created_at desc
limit 3
