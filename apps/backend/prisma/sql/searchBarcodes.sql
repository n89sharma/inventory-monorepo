-- @param {String} $1:q
with scored as (
  select
    a.barcode as barcode,
    a.serial_number as serial_number,
    at.asset_type as asset_type,
    m.name as model,
    (a.barcode_normalized like '%' || $1 || '%'
      or a.serial_normalized like '%' || $1 || '%') as is_substring,
    (a.barcode_normalized = $1) as is_exact,
    (a.barcode_normalized like $1 || '%') as is_prefix,
    greatest(
      similarity(a.barcode_normalized, $1),
      similarity(a.serial_normalized, $1)
    ) as score
  from "Asset" a
    join "Model" m on m.id = a.model_id
    join "AssetType" at on at.id = m.asset_type_id
  where a.barcode_normalized like '%' || $1 || '%'
     or a.serial_normalized  like '%' || $1 || '%'
     or a.barcode_normalized % $1
     or a.serial_normalized  % $1
)
select barcode, serial_number, asset_type, model
from scored
where is_substring
   or not exists (select 1 from scored where is_substring)
order by
  is_exact desc,
  is_prefix desc,
  score desc,
  barcode
limit 10
