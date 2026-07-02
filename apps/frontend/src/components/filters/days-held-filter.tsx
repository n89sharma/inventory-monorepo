import { InputWithClearInline } from '@/components/shared/input-with-clear'

export function DaysHeldFilter({
  value,
  onValueChange,
}: {
  value: number | null
  onValueChange: (daysHeld: number | null) => void
}): React.JSX.Element {
  return (
    <InputWithClearInline
      value={value}
      onValueChange={(val) => {
        if (typeof val === 'string' || val === null) {
          onValueChange(null)
          return
        }
        const next = Number.isInteger(val) && val >= 0 ? val : null
        onValueChange(next)
      }}
      fieldLabel="Days held"
      inputType="number"
      className="w-35"
    />
  )
}
