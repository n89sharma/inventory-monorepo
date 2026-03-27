SELECT
    c.comment as comment,
    u."name" as username,
    c.created_at as created_at,
    c.updated_at as updated_at
from "Comment" c
join "Asset" a ON a.id = c.asset_id 
join "User" u on u.id = c.created_by_id 
where a.barcode =  $1