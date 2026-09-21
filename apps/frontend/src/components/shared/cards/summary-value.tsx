export function SummaryValue({ value }: { value: React.ReactNode }) {
  if (!value) return null
  return <span>{value}</span>
}
