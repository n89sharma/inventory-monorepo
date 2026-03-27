select
	u.id,
	u.username,
	u.name,
	u.email,
	u.role_id,
	r.role
from "User" u
join "Role" r on r.id = u.role_id
where ($1 = false or u.is_active = true)
order by u.name
