-- Every inbound foreign key to Organization, summed per row. Scoped to the ids taking part in a
-- merge, so the correlated subqueries run over a handful of rows and stay index-only.
-- Ordered so the row carrying the most references comes first: that one wins the merge, which
-- both minimises repointing and keeps the links and saved views that already name it.
select
  o.id,
  o."name",
  o.account_number,
  (
    (select count(*) from "Invoice"   i where i.organization_id = o.id) +
    (select count(*) from "Arrival"   a where a.origin_id       = o.id) +
    (select count(*) from "Arrival"   a where a.transporter_id  = o.id) +
    (select count(*) from "Departure" d where d.destination_id  = o.id) +
    (select count(*) from "Departure" d where d.transporter_id  = o.id) +
    (select count(*) from "Hold"      h where h.customer_id     = o.id) +
    (select count(*) from "Transfer"  t where t.transporter_id  = o.id)
  )::int as reference_count
from "Organization" o
where o.id = any($1::int[])
order by reference_count desc, o.id asc
