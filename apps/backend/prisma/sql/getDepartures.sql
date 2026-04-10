select
  d.id as id,
	d.departure_number as departure_number,
	wo.city_code as origin_code,
	wo.street as origin_street,
	od."name" as destination,
	t."name" as transporter,
	d.created_at as created_at,
	u."name"  as created_by,
  (select count(*)::int from "Asset" ast where ast.departure_id = d.id) as asset_count
from "Departure" d
join "User" u on u.id = d.created_by_id 
join "Warehouse" wo on wo.id = d.origin_id
join "Organization" od on od.id = d.destination_id 
join "Organization" t on t.id = d.transporter_id 
where d.created_at between $1 and $2
and ($3 = 0 or wo.id = $3)
order by d.created_at desc
