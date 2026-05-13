select
  h.id as id,
	h.hold_number as hold_number,
	ub."name" as created_by,
	uf."name" as created_for,
	c."name" as customer,
	h.notes as notes,
	h.created_at as created_at,
	h.from_dt as from_dt,
	h.to_dt as to_dt,
  ac.asset_count as asset_count
from "Hold" h
join "User" ub on ub.id = h.created_by_id
join "User" uf on uf.id = h.created_for_id
join "Organization" c on c.id = h.customer_id
left join lateral (
  select count(*)::int as asset_count from "Asset" ast where ast.hold_id = h.id
) ac on true
where h.created_at between $1 and $2
and ($3 = 0 or ub.id = $3)
and ($4 = 0 or uf.id = $4)
order by h.created_at desc
limit 500