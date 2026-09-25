-- TechnicalSpecification is the only inbound foreign key to Component. Ordered so the row carrying
-- the most assets comes first: that one wins the merge.
select
  c.id,
  c.brand_id,
  b."name" as brand_name,
  c."name" as name,
  (select count(*) from "TechnicalSpecification" ts where ts.component_id = c.id)::int as reference_count
from "Component" c
  join "Brand" b on b.id = c.brand_id
where c.id = any($1::int[])
order by reference_count desc, c.id asc
