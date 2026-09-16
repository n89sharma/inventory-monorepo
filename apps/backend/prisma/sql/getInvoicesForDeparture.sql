select distinct
  i.invoice_number as invoice_number,
  i.invoice_reference as invoice_reference,
  o.id as customer_id,
  o."name" as customer
from "Departure" d
  join "Asset" a on a.departure_id = d.id
  join "Invoice" i on i.id = a.sales_invoice_id
  join "Organization" o on o.id = i.organization_id
where d.departure_number = $1
order by i.invoice_number
