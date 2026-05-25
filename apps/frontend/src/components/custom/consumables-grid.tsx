import { cn } from '@/lib/utils'
import { Input } from '../shadcn/input'
import { HorizontalField } from './horizontal-field'

const CMYK_CHANNELS = [
  { letter: 'C', dotClass: 'bg-cyan-500' },
  { letter: 'M', dotClass: 'bg-fuchsia-500' },
  { letter: 'Y', dotClass: 'bg-yellow-500' },
  { letter: 'K', dotClass: 'bg-foreground' },
] as const

const CELLS_TEMPLATE = 'grid-cols-[repeat(4,minmax(0,72px))_auto]'

export function ConsumablesGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-2'>
      <HorizontalField label=''>
        <div className={cn('grid items-center gap-2 px-1', CELLS_TEMPLATE)}>
          {CMYK_CHANNELS.map(c => (
            <div key={c.letter} className='flex items-center justify-center gap-1.5'>
              <span className={cn('size-2 rounded-full', c.dotClass)} />
              <span className='text-xs font-medium text-muted-foreground'>
                {c.letter}
              </span>
            </div>
          ))}
          <span />
        </div>
      </HorizontalField>
      {children}
    </div>
  )
}

export function ConsumablesRow(
  { label, children }: { label: string; children: React.ReactNode }
) {
  return (
    <HorizontalField label={label}>
      <div className={cn('grid items-center gap-2', CELLS_TEMPLATE)}>
        {children}
        <span className='text-xs text-muted-foreground'>%</span>
      </div>
    </HorizontalField>
  )
}

export function ConsumablesCell(
  {
    value,
    onChange,
    invalid,
    ariaLabel,
  }: {
    value: number | null
    onChange: (value: number | null) => void
    invalid?: boolean
    ariaLabel: string
  }
) {
  return (
    <Input
      type='number'
      value={value ?? ''}
      onChange={e => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = Number(raw)
        onChange(isNaN(n) ? null : n)
      }}
      placeholder='–'
      aria-invalid={invalid}
      aria-label={ariaLabel}
      className='h-8 text-center tabular-nums'
    />
  )
}
