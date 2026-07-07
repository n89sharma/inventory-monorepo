import { HorizontalField } from '@/components/shared/horizontal-field'
import { cn } from '@/lib/utils'
import { Input } from '../shadcn/input'

export type Channel = 'C' | 'M' | 'Y' | 'K'

const CHANNEL_ORDER: Channel[] = ['C', 'M', 'Y', 'K']

const CHANNEL_DOT_CLASS = {
  C: 'bg-cyan-500',
  M: 'bg-fuchsia-500',
  Y: 'bg-yellow-500',
  K: 'bg-foreground',
} as const satisfies Record<Channel, string>

export function ChannelLabel({ channel }: { channel: Channel }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', CHANNEL_DOT_CLASS[channel])} />
    </span>
  )
}

const CELL_WIDTH_PX = 72

function cellsTemplate(columnCount: number) {
  return `repeat(${columnCount}, minmax(0, ${CELL_WIDTH_PX}px)) auto`
}

export function ConsumablesGrid({
  children,
  visibleChannels,
}: {
  children: React.ReactNode
  visibleChannels: Channel[]
}) {
  const channels = CHANNEL_ORDER.filter((c) => visibleChannels.includes(c))
  return (
    <div className="flex flex-col gap-2">
      <HorizontalField label="">
        <div
          className="grid items-center gap-2 px-1"
          style={{ gridTemplateColumns: cellsTemplate(channels.length) }}
        >
          {channels.map((channel) => (
            <div key={channel} className="flex items-center justify-center">
              <ChannelLabel channel={channel} />
            </div>
          ))}
          <span />
        </div>
      </HorizontalField>
      {children}
    </div>
  )
}

export function ConsumablesRow({
  label,
  required,
  columnCount,
  unit,
  children,
}: {
  label: string
  required?: boolean
  columnCount: number
  unit: string
  children: React.ReactNode
}) {
  return (
    <HorizontalField label={label} required={required}>
      <div
        className="grid items-center gap-2"
        style={{ gridTemplateColumns: cellsTemplate(columnCount) }}
      >
        {children}
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </HorizontalField>
  )
}

export function ConsumablesCell({
  value,
  onChange,
  invalid,
  ariaLabel,
}: {
  value: number | null
  onChange: (value: number | null) => void
  invalid?: boolean
  ariaLabel: string
}) {
  return (
    <Input
      type="number"
      min={0}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = Number(raw)
        if (isNaN(n)) return onChange(null)
        onChange(Math.max(0, n))
      }}
      placeholder=""
      aria-invalid={invalid}
      aria-label={ariaLabel}
      className="h-8 text-center tabular-nums"
    />
  )
}
