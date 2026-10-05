-- One permission for every manual asset status change: return to stock after a departure,
-- harvest and its reversal, and resolving or marking missing assets.
INSERT INTO "Permission" ("key") VALUES ('update_asset_status');

INSERT INTO "RolePermission" ("role_code", "permission_key")
SELECT DISTINCT rp."role_code", 'update_asset_status'
FROM "RolePermission" rp
WHERE rp."permission_key" IN ('return_to_stock', 'harvest_asset', 'resolve_missing_asset');

DELETE FROM "RolePermission"
WHERE "permission_key" IN ('return_to_stock', 'harvest_asset', 'resolve_missing_asset');

DELETE FROM "Permission"
WHERE "key" IN ('return_to_stock', 'harvest_asset', 'resolve_missing_asset');
