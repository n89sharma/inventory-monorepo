select
	u.id,
  u.clerk_id,
	u.name,
	u.email,
	u.role,
  u.is_active,
  u.default_warehouse_id
from "User" u
order by u.name
