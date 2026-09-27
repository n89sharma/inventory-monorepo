import { Card } from '@/components/shadcn/card'
import { cn } from '@/lib/utils'

export function MetricCard({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}): React.JSX.Element {
  return (
    <Card size="sm" className="flex-1 min-w-40 gap-1 px-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-semibold tabular-nums', valueClassName)}>{value}</span>
    </Card>
  )
}

export function MetricCardRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="mx-auto flex max-w-3xl flex-wrap gap-3">{children}</div>
}
