import { Button } from '../shadcn/button'

export function DetailGrid({
  title,
  fields,
  onClear,
}: {
  title: string
  fields: { label: string; value: string | null }[]
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <p className="font-medium px-1">{title}</p>
        <Button variant="secondary" size="sm" onClick={onClear}>
          Change
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-1">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
