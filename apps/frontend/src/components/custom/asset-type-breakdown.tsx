import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip"
import type { CollectionSummarySchema } from 'shared-types'

const ASSET_TYPE_LABELS = {
  copier_count: 'Copiers',
  finisher_count: 'Finishers',
  accessory_count: 'Accessories',
  other_count: 'Other',
} as const satisfies Record<string, string>

type AssetTypeCountKey = keyof typeof ASSET_TYPE_LABELS

export function AssetTypeBreakdown({
  summary,
}: {
  summary: CollectionSummarySchema
}): React.JSX.Element {
  const total = summary.asset_count ?? 0
  const copiers = summary.copier_count ?? 0

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block cursor-default tabular-nums">
          <span className={copiers > 0 ? "font-medium" : "text-muted-foreground"}>
            {copiers}
          </span>
          <span className="text-muted-foreground"> / {total}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5">
          {(Object.keys(ASSET_TYPE_LABELS) as AssetTypeCountKey[]).map((key) => (
            <div key={key} className="flex justify-between gap-4 tabular-nums">
              <span>{ASSET_TYPE_LABELS[key]}</span>
              <span>{summary[key] ?? 0}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
