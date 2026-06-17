select
  asp.store_part_id as store_part_id,
  sp.part_number as part_number,
  sp.description as description,
  st.quantity as quantity,
  asp.estimated_cost as estimated_cost
from "AssetStorePart" asp
join "Asset" a on a.id = asp.asset_id
join "StorePart" sp on sp.id = asp.store_part_id
join "StoreTransaction" st on st.id = asp.store_transaction_id
where a.barcode = $1
order by asp.created_at desc
