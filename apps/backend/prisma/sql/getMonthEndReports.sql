select
  mr.id as id,
  mr.kind as kind,
  mr.period as period,
  mr.captured_at as captured_at,
  u."name" as created_by,
  (
    coalesce((select sum(ma.total_cost) from "MonthEndReportAsset" ma where ma.report_id = mr.id), 0)
    + coalesce((select sum(mp.stock_value) from "MonthEndReportPart" mp where mp.report_id = mr.id), 0)
  )::float8 as total_cost
from "MonthEndReport" mr
  left join "User" u on u.id = mr.created_by_id
order by mr.captured_at desc
