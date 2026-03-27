select
  m.id as id,
  b."name" as brand_name,
  m."name" as model_name,
  a.asset_type as asset_type,
  weight as weight,
  size as size
from "Model" m
  join "AssetType" a on a.id = m.asset_type_id
  join "Brand" b on b.id = m.brand_id 