select
	t.created_at as created_at,
	wo.city_code as source_code,
	wo.street as source_stree,
	wd.city_code as destination_code,
	wd.street as destination_street,
	t.transfer_number as transfer_number,
	o."name" as transporter
from "AssetTransfer" at
join "Asset" a on a.id = at.asset_id 
join "Transfer" t on t.id = at.transfer_id 
join "Warehouse" wo on wo.id = t.origin_id 
join "Warehouse" wd on wd.id = t.destination_id 
join "Organization" o on o.id = t.transporter_id  
where a.barcode = $1