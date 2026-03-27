select
	h.hold_number as hold_number,
	ub."name" as created_by,
	uf."name" as created_for,
	c."name" as customer,
	h.notes as notes,
	h.created_at as created_at,
	h.from_dt as from_dt,
	h.to_dt as to_dt
from "Hold" h
join "User" ub on ub.id = h.created_by_id 
join "User" uf on uf.id = h.created_for_id 
join "Organization" c on c.id = h.customer_id 
where h.created_at between $1 and $2
and ($3 = 0 or ub.id = $3)
and ($4 = 0 or uf.id = $4)