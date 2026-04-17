select
	r.barcode as recipient,
	d.barcode as donor,
	pt.part as part,
  pt.fixed_at as fixed_at,
  u.username as fixed_by,
  pt.notes as notes,
  is_exchange as is_exchange
from "PartTransfer" pt
join "Asset" r on r.id = pt.recipient_asset_id 
join "Asset" d on d.id = pt.donor_asset_id 
join "User" u on u.id = pt.fixed_by 
where r.barcode = $1 OR d.barcode = $1