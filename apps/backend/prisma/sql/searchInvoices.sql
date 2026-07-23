-- @param {String} $1:q
select id, invoice_number, invoice_reference, organization, invoice_type, created_at
from (
  select
    i.id as id,
    i.invoice_number as invoice_number,
    i.invoice_reference as invoice_reference,
    o.name as organization,
    it.type as invoice_type,
    i.created_at as created_at,
    (i.invoice_reference_normalized like '%' || $1 || '%') as is_substring,
    (i.invoice_reference_normalized = $1) as is_exact,
    (i.invoice_reference_normalized like $1 || '%') as is_prefix,
    similarity(i.invoice_reference_normalized, $1) as score,
    bool_or(i.invoice_reference_normalized like '%' || $1 || '%') over () as any_substring
  from "Invoice" i
    join "Organization" o on o.id = i.organization_id
    join "InvoiceType" it on it.id = i.invoice_type_id
  where i.invoice_reference_normalized like '%' || $1 || '%'
     or i.invoice_reference_normalized % $1
) candidates
where is_substring or not any_substring
order by is_exact desc, is_prefix desc, score desc, created_at desc
limit 10
