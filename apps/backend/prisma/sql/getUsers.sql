select
	u.id,
  u.clerk_id,
	u.name,
	u.email,
	u.role,
  u.is_active
from "User" u
order by u.name
