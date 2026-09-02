-- Asset is the only inbound foreign key to Model. Ordered so the row carrying the most assets
-- comes first: that one wins the merge.
select
  m.id,
  b."name" as brand_name,
  m."name" as model_name,
  (select count(*) from "Asset" a where a.model_id = m.id)::int as reference_count
from "Model" m
  join "Brand" b on b.id = m.brand_id
where m.id = any($1::int[])
order by reference_count desc, m.id asc
