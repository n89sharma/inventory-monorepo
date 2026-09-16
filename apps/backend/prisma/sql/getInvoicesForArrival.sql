select distinct
  i.invoice_number as invoice_number,
  i.invoice_reference as invoice_reference,
  o.id as vendor_id,
  o."name" as vendor
from "Arrival" ar
  join "Asset" a on a.arrival_id = ar.id
  join "Invoice" i on i.id = a.purchase_invoice_id
  join "Organization" o on o.id = i.organization_id
where ar.arrival_number = $1
order by i.invoice_number
