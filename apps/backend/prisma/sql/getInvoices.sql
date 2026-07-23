select
  i.id as id,
  i.invoice_number,
  i.invoice_reference,
  o."name" as organization,
  u."name" as created_by,
  i.created_at as created_at,
  i.is_cleared as is_cleared,
  it.type as invoice_type,
  ac.asset_count as asset_count,
  ac.copier_count as copier_count,
  ac.finisher_count as finisher_count,
  ac.accessory_count as accessory_count,
  ac.other_count as other_count
from "Invoice" i
  join "InvoiceType" it on it.id = i.invoice_type_id
  join "Organization" o on o.id = i.organization_id
  join "User" u on u.id = i.updated_by_id
  left join lateral (
    select
      count(*)::int as asset_count,
      count(*) filter (where atype.asset_type = 'COPIER')::int as copier_count,
      count(*) filter (where atype.asset_type = 'FINISHER')::int as finisher_count,
      count(*) filter (where atype.asset_type = 'ACCESSORY')::int as accessory_count,
      count(*) filter (
        where atype.asset_type not in ('COPIER', 'FINISHER', 'ACCESSORY')
      )::int as other_count
    from "Asset" ast
    join "Model" m on m.id = ast.model_id
    join "AssetType" atype on atype.id = m.asset_type_id
    where ast.purchase_invoice_id = i.id or ast.sales_invoice_id = i.id
  ) ac on true
where it.type = $3
  and i.invoice_date between $1 and $2
order by i.invoice_date desc
limit 500