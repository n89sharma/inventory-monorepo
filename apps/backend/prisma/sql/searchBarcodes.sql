-- @param {String} $1:q
select
  a.barcode as barcode,
  a.serial_number as serial_number,
  at.asset_type as asset_type,
  m.name as model
from "Asset" a
  join "Model" m on m.id = a.model_id
  join "AssetType" at on at.id = m.asset_type_id
where a.barcode like $1 || '%'
   or a.serial_number like '%' || $1 || '%'
order by a.barcode
limit 5
