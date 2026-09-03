select
  i.id as id,
  i.invoice_number,
  i.invoice_reference,
  o."name" as organization,
  u."name" as created_by,
  i.created_at as created_at,
  i.invoice_date as invoice_date,
  i.notes as notes,
  i.is_cleared as is_cleared,
  it.type as invoice_type,
  ac.asset_count as asset_count,
  ac.copier_count as copier_count,
  ac.finisher_count as finisher_count,
  ac.accessory_count as accessory_count,
  ac.other_count as other_count,
  arr.destination_codes as destination_codes,
  arr.arrival_numbers as arrival_numbers,
  arr.transporters as transporters,
  cost.purchase_cost as purchase_cost,
  cost.transport_cost as transport_cost,
  cost.transfer_cost as transfer_cost,
  cost.total_cost as total_cost,
  cost.sale_price as sale_price
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
  left join lateral (
    select
      array_agg(distinct w.city_code order by w.city_code) as destination_codes,
      array_agg(distinct ar.arrival_number order by ar.arrival_number) as arrival_numbers,
      array_agg(distinct t."name" order by t."name") as transporters
    from "Asset" a
    join "Arrival" ar on ar.id = a.arrival_id
    join "Organization" t on t.id = ar.transporter_id
    join "Warehouse" w on w.id = ar.destination_id
    where a.purchase_invoice_id = i.id or a.sales_invoice_id = i.id
  ) arr on true
  left join lateral (
    select
      sum(c.purchase_cost) as purchase_cost,
      sum(c.transport_cost) as transport_cost,
      sum(c.transfer_cost) as transfer_cost,
      sum(c.total_cost) as total_cost,
      sum(c.sale_price) as sale_price
    from "Asset" a
    join "Cost" c on c.asset_id = a.id
    where a.purchase_invoice_id = i.id or a.sales_invoice_id = i.id
  ) cost on true
where it.type = $3
  and i.invoice_date between $1 and $2
order by i.invoice_date desc
limit 500