select
  b.bid_number as bid_number,
  b.status as status,
  b.outcome as outcome,
  b.received_date as received_date,
  b.due_date as due_date,
  b.submitted_date as submitted_date,
  b.notes as notes,
  o.id as vendor_id,
  o.account_number as vendor_account_number,
  o."name" as vendor_name,
  coalesce(rt.total_cost, 0)::float8 as total_cost,
  rt.row_count as row_count
from "Bid" b
join "Organization" o on o.id = b.vendor_id
left join lateral (
  select sum(r.total_cost) as total_cost, count(*)::int as row_count
  from "BidRow" r
  where r.bid_id = b.id
) rt on true
where b.received_date between $1::date and $2::date
and ($3 = 0 or o.id = $3)
order by b.received_date desc, b.id desc
limit 500
