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
	h.archived_at as archived_at,
  ac.asset_count as asset_count,
  ac.copier_count as copier_count,
  ac.finisher_count as finisher_count,
  ac.accessory_count as accessory_count,
  ac.other_count as other_count
from "Hold" h
join "User" ub on ub.id = h.created_by_id
join "User" uf on uf.id = h.created_for_id
join "Organization" c on c.id = h.customer_id
left join lateral (
  select
    count(*)::int as asset_count,
    count(*) filter (where atype.asset_type = 'COPIER')::int as copier_count,
    count(*) filter (where atype.asset_type = 'FINISHER')::int as finisher_count,
    count(*) filter (where atype.asset_type = 'ACCESSORY')::int as accessory_count,
    count(*) filter (
      where atype.asset_type not in ('COPIER', 'FINISHER', 'ACCESSORY')
    )::int as other_count
  from "Asset" ast
  join "Model" m on m.id = ast.model_id
  join "AssetType" atype on atype.id = m.asset_type_id
  where ast.hold_id = h.id
) ac on true
where h.created_at between $1 and $2
and ($3 = 0 or ub.id = $3)
and ($4 = 0 or uf.id = $4)
and h.archived_at is null
order by h.created_at desc
limit 500