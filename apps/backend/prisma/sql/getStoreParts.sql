select
  sp.id as id,
  sp.part_number as part_number,
  sp.description as description,
  st.warehouse_id as warehouse_id,
  w.city_code as warehouse_code,
  (
    coalesce(sum(st.quantity) filter (where stt.is_inbound), 0)
    - coalesce(sum(st.quantity) filter (where not stt.is_inbound), 0)
  )::int as on_hand,
  max(st.created_at) as last_updated
from "StoreTransaction" st
join "StorePart" sp on sp.id = st.store_part_id
join "StoreTransactionType" stt on stt.id = st.transaction_type_id
join "Warehouse" w on w.id = st.warehouse_id
group by sp.id, sp.part_number, sp.description, st.warehouse_id, w.city_code
order by max(st.created_at) desc
