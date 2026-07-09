select
  st.id as id,
  st.store_transaction_number as store_transaction_number,
  st.created_at as created_at,
  st.warehouse_id as warehouse_id,
  w.city_code as warehouse_code,
  stt.type as type,
  stt.is_inbound as is_inbound,
  st.quantity as quantity,
  st.unit_cost as unit_cost,
  d.id as departure_id,
  d.departure_number as departure_number,
  asp.asset_id as asset_id,
  asp.asset_barcode as asset_barcode,
  u."name" as created_by,
  st.notes as notes
from "StoreTransaction" st
join "StoreTransactionType" stt on stt.id = st.transaction_type_id
join "Warehouse" w on w.id = st.warehouse_id
join "User" u on u.id = st.created_by_id
left join "Departure" d on d.id = st.departure_id
left join lateral (
  select a.id as asset_id, a.barcode as asset_barcode
  from "AssetStorePart" asp2
  join "Asset" a on a.id = asp2.asset_id
  where asp2.store_transaction_id = st.id
  limit 1
) asp on true
where st.store_part_id = $1
order by st.created_at desc
