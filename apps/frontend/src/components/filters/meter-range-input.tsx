import { InputWithClearInline } from '@/components/custom/input-with-clear'

export type MeterRangeInputProps = {
  min: number | null
  max: number | null
  onMinChange: (val: number | null) => void
  onMaxChange: (val: number | null) => void
  className?: string
}

function rawToThousands(raw: number | null): number | null {
  return raw === null ? null : raw / 1000
}

function thousandsToRaw(val: string | number | null): number | null {
  if (typeof val !== 'number' || val < 0) return null
  return val * 1000
}

export function MeterRangeInput({
  min,
  max,
  onMinChange,
  onMaxChange,
  className,
}: MeterRangeInputProps): React.JSX.Element {
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <InputWithClearInline
        value={rawToThousands(min)}
        onValueChange={(val) => onMinChange(thousandsToRaw(val))}
        fieldLabel="Meter min"
        inputType="number"
        suffix="K"
        className="flex-1 min-w-0"
      />
      <span className="text-muted-foreground shrink-0">–</span>
      <InputWithClearInline
        value={rawToThousands(max)}
        onValueChange={(val) => onMaxChange(thousandsToRaw(val))}
        fieldLabel="Meter max"
        inputType="number"
        suffix="K"
        className="flex-1 min-w-0"
      />
    </div>
  )
}
