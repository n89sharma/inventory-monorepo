select
  t.id as id,
	t.transfer_number as transfer_number,
	t.created_at as created_at,
	wo.city_code as origin_code,
	wo.street as origin_street,
	wd.city_code as destination_code,
	wd.street as destination_street,
	tr."name" as transporter,
  u."name"  as created_by,
  (select count(*)::int from "AssetTransfer" at where at.transfer_id = t.id) as asset_count
from "Transfer" t
join "User" u on u.id = t.created_by_id 
join "Warehouse" wo on wo.id = t.origin_id  
join "Warehouse" wd on wd.id = t.destination_id 
join "Organization" tr on tr.id = t.transporter_id 
where t.created_at between $1 and $2
and ($3 = 0 or wo.id = $3)
and ($4 = 0 or wd.id = $4)
order by t.created_at desc
