SELECT
  ac.accessory
from "AssetAccessory" aa
  join "Asset" at on at.id = aa.asset_id
  join "Accessory" ac on ac.id = aa.accessory_id
where at.barcode = $1