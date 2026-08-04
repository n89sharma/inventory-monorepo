select
  st.quantity as quantity,
  st.unit_cost as unit_cost
from "StoreTransaction" st
join "StoreTransactionType" stt on stt.id = st.transaction_type_id
where stt.is_inbound
  and st.store_part_id = $1
  and st.warehouse_id = $2
order by st.created_at, st.id
