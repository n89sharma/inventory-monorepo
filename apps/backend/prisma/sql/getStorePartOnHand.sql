select
  (
    coalesce(sum(st.quantity) filter (where stt.is_inbound), 0)
    - coalesce(sum(st.quantity) filter (where not stt.is_inbound), 0)
  )::int as on_hand
from "StoreTransaction" st
join "StoreTransactionType" stt on stt.id = st.transaction_type_id
where st.store_part_id = $1
  and st.warehouse_id = $2
