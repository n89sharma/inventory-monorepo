import { SummaryValue } from '@/components/shared/cards/summary-value'

export function SummaryField({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <SummaryValue value={value} />
    </div>
  )
}
