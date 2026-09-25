select
  c.id as id,
  c.brand_id as brand_id,
  b."name" as brand_name,
  c."name" as name,
  c.is_active as is_active,
  (select count(*) from "TechnicalSpecification" ts where ts.component_id = c.id)::int as asset_count
from "Component" c
  join "Brand" b on b.id = c.brand_id
order by b."name", c."name"
