select
  t.id as id,
	t.transfer_number as transfer_number,
	t.status as status,
	t.created_at as created_at,
	wo.city_code as origin_code,
	wo.street as origin_street,
	wd.city_code as destination_code,
	wd.street as destination_street,
	tr."name" as transporter,
  u."name"  as created_by,
  ac.asset_count as asset_count,
  ac.copier_count as copier_count,
  ac.finisher_count as finisher_count,
  ac.accessory_count as accessory_count,
  ac.other_count as other_count
from "Transfer" t
join "User" u on u.id = t.created_by_id
join "Warehouse" wo on wo.id = t.origin_id
join "Warehouse" wd on wd.id = t.destination_id
join "Organization" tr on tr.id = t.transporter_id
left join lateral (
  select
    count(*)::int as asset_count,
    count(*) filter (where atype.asset_type = 'COPIER')::int as copier_count,
    count(*) filter (where atype.asset_type = 'FINISHER')::int as finisher_count,
    count(*) filter (where atype.asset_type = 'ACCESSORY')::int as accessory_count,
    count(*) filter (
      where atype.asset_type not in ('COPIER', 'FINISHER', 'ACCESSORY')
    )::int as other_count
  from "AssetTransfer" at
  join "Asset" a on a.id = at.asset_id
  join "Model" m on m.id = a.model_id
  join "AssetType" atype on atype.id = m.asset_type_id
  where at.transfer_id = t.id
) ac on true
where t.created_at between $1 and $2
and ($3 = 0 or wo.id = $3)
and ($4 = 0 or wd.id = $4)
order by t.created_at desc
limit 500
