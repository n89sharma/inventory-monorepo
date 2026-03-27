select
	r.barcode as recipient,
	d.barcode as donor,
	s.part_number as store_part_number,
	ap.updated_at as updated_at,
	u.username as username,
	ap.notes as notes
from "AssetPart" ap
join "Asset" r on r.id = ap.recipient_asset_id 
left join "Asset" d on d.id = ap.donor_asset_id 
left join "Part" s on s.id = ap.store_part_id 
left join "User" u on u.id = ap.updated_by 
where r.barcode = $1