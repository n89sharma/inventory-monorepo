select
  a.id as id,
	a.arrival_number as arrival_number,
	a.created_at as created_at,
	w.city_code as destination_code,
	w.street as destination_street,
	o."name" as vendor,
	t."name" as transporter,
	u."name"  as created_by,
  ac.asset_count as asset_count,
  ac.copier_count as copier_count,
  ac.finisher_count as finisher_count,
  ac.accessory_count as accessory_count,
  ac.other_count as other_count
from "Arrival" a
left join "User" u on u.id = a.created_by_id
join "Warehouse" w on w.id = a.destination_id
join "Organization" o on o.id = a.origin_id
join "Organization" t on t.id = a.transporter_id
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
  where ast.arrival_id = a.id
) ac on true
where a.created_at between $1 and $2
and ($3 = 0 or w.id = $3)
and ($4 = 0 or o.id = $4)
order by a.created_at desc
limit 500