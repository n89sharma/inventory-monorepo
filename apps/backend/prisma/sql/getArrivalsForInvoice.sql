select distinct
  ar.arrival_number as arrival_number,
  t."name" as transporter,
  w.city_code as destination_code,
  ro.id as vendor_id,
  ro."name" as vendor
from "Invoice" i
  join "Asset" a on (i.id = a.purchase_invoice_id or i.id = a.sales_invoice_id)
  join "Arrival" ar on ar.id = a.arrival_id
  join "Organization" t on t.id = ar.transporter_id
  join "Organization" ro on ro.id = ar.origin_id
  join "Warehouse" w on w.id = ar.destination_id
where i.invoice_number = $1
order by ar.arrival_number
