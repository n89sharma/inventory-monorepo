-- Returning a missing asset to stock once it has been found.
INSERT INTO "Permission" ("key") VALUES ('resolve_missing_asset');

-- assistant_inventory_manager exists only in some environments; the join skips it where absent.
INSERT INTO "RolePermission" ("role_code", "permission_key")
SELECT r."code", 'resolve_missing_asset'
FROM "Role" r
WHERE r."code" IN (
    'admin',
    'leadership',
    'general_manager',
    'inventory_manager',
    'branch_manager',
    'assistant_inventory_manager'
);
