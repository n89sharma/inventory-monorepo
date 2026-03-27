SELECT
    e.code as code,
    e.description as description,
    e.category as category,
    ae.is_fixed as is_fixed,
    ae.added_at as added_at,
    ub."name" as added_by,
    ae.fixed_at as fixed_at,
    ux."name" as fixed_by
from "AssetError" ae
join "Asset" a ON a.id = ae.asset_id
join "Error" e on e.id = ae.error_id 
left join "User" ub on ub.id = ae.added_by 
left join "User" ux on ux.id = ae.fixed_by 
where a.barcode = $1