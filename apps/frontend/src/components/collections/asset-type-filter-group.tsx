import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import {
  ASSET_TYPE_FILTER_OPTIONS,
  ASSET_TYPE_FILTER_VALUES,
  type AssetTypeCounts,
  type AssetTypeFilter,
} from '@/lib/asset-type-filter'

const GROUP_LABEL = 'Asset type'

const ITEM_CLASS =
  'whitespace-nowrap bg-background data-[state=on]:border-secondary data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[state=on]:hover:bg-secondary/80'

function isAssetTypeFilter(value: string): value is AssetTypeFilter {
  return ASSET_TYPE_FILTER_VALUES.some((filter) => filter === value)
}

export function AssetTypeFilterGroup({
  value,
  counts,
  onValueChange,
}: {
  value: AssetTypeFilter
  counts: AssetTypeCounts
  onValueChange: (value: AssetTypeFilter) => void
}): React.JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value}
      onValueChange={(newValue) => {
        if (isAssetTypeFilter(newValue)) onValueChange(newValue)
      }}
      aria-label={GROUP_LABEL}
      className="shrink-0"
    >
      {ASSET_TYPE_FILTER_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={counts[option.value] === 0}
          className={ITEM_CLASS}
        >
          {option.label}
          <span className="tabular-nums">{counts[option.value]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
