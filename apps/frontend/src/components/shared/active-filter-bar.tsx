import { Button } from '@/components/shadcn/button'

export function ActiveFilterBar({
  count,
  onClear,
}: {
  count: number
  onClear: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {count} {count === 1 ? 'filter' : 'filters'} active
      </span>
      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onClear}>
        Clear all
      </Button>
    </div>
  )
}
