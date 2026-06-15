import { InputWithClearInline } from '@/components/custom/input-with-clear'

export function CassettesFilter({
  value,
  onValueChange,
}: {
  value: number | null
  onValueChange: (cassettes: number | null) => void
}): React.JSX.Element {
  return (
    <InputWithClearInline
      value={value}
      onValueChange={val => {
        const next = typeof val === 'string' || val === null
          ? null
          : Number.isInteger(val) && val >= 0 ? val : null
        onValueChange(next)
      }}
      fieldLabel='Cassettes (min)'
      inputType='number'
      className='w-35'
    />
  )
}
