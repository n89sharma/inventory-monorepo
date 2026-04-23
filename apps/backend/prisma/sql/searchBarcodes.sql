-- @param {String} $1:prefix
select
  a.barcode as barcode,
  at.asset_type as asset_type,
  m.name as model
from "Asset" a
  join "Model" m on m.id = a.model_id
  join "AssetType" at on at.id = m.asset_type_id
where a.barcode like $1 || '%'
order by a.barcode
limit 5
