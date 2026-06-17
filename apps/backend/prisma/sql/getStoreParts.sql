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
  (
    select st2.unit_cost
    from "StoreTransaction" st2
    join "StoreTransactionType" stt2 on stt2.id = st2.transaction_type_id
    where st2.store_part_id = sp.id
      and st2.warehouse_id = st.warehouse_id
      and stt2.is_inbound
    order by st2.created_at desc
    limit 1
  ) as last_purchase_unit_cost,
  max(st.created_at) as last_updated
from "StoreTransaction" st
join "StorePart" sp on sp.id = st.store_part_id
join "StoreTransactionType" stt on stt.id = st.transaction_type_id
join "Warehouse" w on w.id = st.warehouse_id
group by sp.id, sp.part_number, sp.description, st.warehouse_id, w.city_code
order by max(st.created_at) desc
