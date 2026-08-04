select
  st.store_part_id as store_part_id,
  st.warehouse_id as warehouse_id,
  st.quantity as quantity,
  st.unit_cost as unit_cost
from "StoreTransaction" st
join "StoreTransactionType" stt on stt.id = st.transaction_type_id
where stt.is_inbound
order by st.store_part_id, st.warehouse_id, st.created_at, st.id
