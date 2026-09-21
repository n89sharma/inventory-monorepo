const ROUTE_ARROW = '→'

export function SummaryRoute({ from, to }: { from: React.ReactNode; to: React.ReactNode }) {
  if (!from && !to) return null
  if (!from || !to) return <span>{from || to}</span>
  return (
    <span className="flex items-baseline gap-1.5">
      {from}
      <span className="text-muted-foreground">{ROUTE_ARROW}</span>
      {to}
    </span>
  )
}
