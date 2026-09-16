select distinct
  d.departure_number as departure_number,
  o.id as customer_id,
  o."name" as customer
from "Invoice" i
  join "Asset" a on (i.id = a.purchase_invoice_id or i.id = a.sales_invoice_id)
  join "Departure" d on d.id = a.departure_id
  join "Organization" o on o.id = d.destination_id
where i.invoice_number = $1
order by d.departure_number
