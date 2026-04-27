-- @param {String} $1:q
select
  i.id as id,
  i.invoice_number as invoice_number,
  o.name as organization,
  it.type as invoice_type,
  i.created_at as created_at
from "Invoice" i
  join "Organization" o on o.id = i.organization_id
  join "InvoiceType" it on it.id = i.invoice_type_id
where i.invoice_number like $1 || '%'
order by i.created_at desc
limit 3
