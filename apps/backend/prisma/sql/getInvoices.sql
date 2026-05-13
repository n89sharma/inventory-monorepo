select
  i.id as id,
  i.invoice_number,
  o."name" as organization,
  u."name" as created_by,
  i.created_at as created_at,
  i.is_cleared as is_cleared,
  it.type as invoice_type,
  ac.asset_count as asset_count
from "Invoice" i
  join "InvoiceType" it on it.id = i.invoice_type_id
  join "Organization" o on o.id = i.organization_id
  join "User" u on u.id = i.updated_by_id
  left join lateral (
    select (
      count(*) filter (where ast.purchase_invoice_id = i.id) +
      count(*) filter (where ast.sales_invoice_id    = i.id)
    )::int as asset_count
    from "Asset" ast
    where ast.purchase_invoice_id = i.id or ast.sales_invoice_id = i.id
  ) ac on true
where i.created_at between $1 and $2
order by i.created_at desc
limit 500