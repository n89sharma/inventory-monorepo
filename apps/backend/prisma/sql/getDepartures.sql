select
  d.id as id,
	d.departure_number as departure_number,
	wo.city_code as origin_code,
	wo.street as origin_street,
	od."name" as destination,
	t."name" as transporter,
	d.created_at as created_at,
	d.departure_date as departure_date,
	u."name"  as created_by,
	sp."name" as salesperson,
  ac.asset_count as asset_count,
  ac.copier_count as copier_count,
  ac.finisher_count as finisher_count,
  ac.accessory_count as accessory_count,
  ac.other_count as other_count
from "Departure" d
join "User" u on u.id = d.created_by_id
left join "User" sp on sp.id = d.sales_representative_id
join "Warehouse" wo on wo.id = d.origin_id
join "Organization" od on od.id = d.destination_id
join "Organization" t on t.id = d.transporter_id
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
  where ast.departure_id = d.id
) ac on true
where coalesce(d.departure_date, d.created_at::date) between $1::date and $2::date
and ($3 = 0 or wo.id = $3)
and ($4 = 0 or od.id = $4)
order by coalesce(d.departure_date, d.created_at::date) desc, d.created_at desc
limit 500
