import { Badge } from '@/components/shadcn/badge'
import { formatUSD } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { CurrencyDollarIcon } from '@phosphor-icons/react'

// Ink channels, with the colour each is drawn in. A mono asset carries the K channel
// only — see KRow — so the C/M/Y values it has no ink for are never rendered.
const CHANNEL_TEXT_COLOURS = {
  C: 'text-cyan-500',
  M: 'text-fuchsia-500',
  Y: 'text-yellow-500',
  K: 'text-foreground',
} as const

type Channel = keyof typeof CHANNEL_TEXT_COLOURS

type ChannelValue = {
  channel: Channel
  value: number | undefined | null
}

type CMYKDataProps = {
  label: string
  c_value: number | undefined | null
  m_value: number | undefined | null
  y_value: number | undefined | null
  k_value: number | undefined | null
  rowClassName?: string
}

type KDataProps = {
  label: string
  k_value: number | undefined | null
  rowClassName?: string
}

type ChannelRowProps = {
  label: string
  channels: ChannelValue[]
  rowClassName?: string
}

type AccessoryDataProps = {
  label: string
  accessories: string[]
  rowClassName?: string
}

type DataRowProps = {
  label: string
  children: React.ReactNode
  rowClassName?: string
  labelClassName?: string
}

type DataValueRowProps = {
  label: string
  value: string | number | undefined | null
  rowClassName?: string
  labelClassName?: string
  valueClassName?: string
}

type DataCurrencyRowProps = {
  label: string
  value: number | null | undefined
  rowClassName?: string
}

type LabelProps = {
  label: string
  className?: string
}

type ValueProps = {
  value: string | number | undefined | null
  className?: string
}

function DataLabel({ label, className }: LabelProps): React.JSX.Element {
  return <dt className={cn('text-left text-muted-foreground min-w-26', className)}>{label}</dt>
}

function DataValue({ value, className }: ValueProps): React.JSX.Element {
  const valuePresent = (typeof value === 'string' && value.length > 0) || value

  return <dd className={cn('min-w-0 wrap-break-words', className)}>{valuePresent ? value : '-'}</dd>
}

export function DataRow({
  label,
  children,
  rowClassName,
  labelClassName,
}: DataRowProps): React.JSX.Element {
  return (
    <div className={cn('flex items-start gap-4 py-1', rowClassName)}>
      <DataLabel label={label} className={labelClassName} />
      {children}
    </div>
  )
}

export function DataValueRow({
  label,
  value,
  rowClassName,
  labelClassName,
  valueClassName,
}: DataValueRowProps): React.JSX.Element {
  return (
    <DataRow label={label} rowClassName={rowClassName} labelClassName={labelClassName}>
      <DataValue value={value} className={valueClassName} />
    </DataRow>
  )
}

export function DataCurrencyRow({
  label,
  value,
  rowClassName,
}: DataCurrencyRowProps): React.JSX.Element {
  return (
    <DataRow label={label} rowClassName={rowClassName}>
      <dd className="flex min-w-0 items-center gap-1">
        {value != null && (
          <span>
            <CurrencyDollarIcon />
          </span>
        )}
        <span className="tabular-nums text-right w-20">
          {value != null ? formatUSD(value) : '-'}
        </span>
      </dd>
    </DataRow>
  )
}

function ChannelRow({ label, channels, rowClassName }: ChannelRowProps): React.JSX.Element {
  return (
    <DataRow label={label} rowClassName={rowClassName}>
      <dd className="flex min-w-0 items-center gap-2">
        {channels.map(({ channel, value }) => (
          <span key={channel} className="flex items-baseline">
            <span className={cn('text-xs', CHANNEL_TEXT_COLOURS[channel])}>{channel}</span>
            <span className="tabular-nums">{value ?? 0}</span>
          </span>
        ))}
      </dd>
    </DataRow>
  )
}

export function CMYKRow({
  label,
  c_value,
  m_value,
  y_value,
  k_value,
  rowClassName,
}: CMYKDataProps): React.JSX.Element {
  return (
    <ChannelRow
      label={label}
      rowClassName={rowClassName}
      channels={[
        { channel: 'C', value: c_value },
        { channel: 'M', value: m_value },
        { channel: 'Y', value: y_value },
        { channel: 'K', value: k_value },
      ]}
    />
  )
}

export function KRow({ label, k_value, rowClassName }: KDataProps): React.JSX.Element {
  return (
    <ChannelRow
      label={label}
      rowClassName={rowClassName}
      channels={[{ channel: 'K', value: k_value }]}
    />
  )
}

export function AccessoryRow({
  label,
  accessories,
  rowClassName,
}: AccessoryDataProps): React.JSX.Element {
  return (
    <DataRow label={label} rowClassName={rowClassName}>
      <div className="flex flex-wrap gap-1">
        {accessories.map((a) => (
          <Badge variant="outline" key={a}>
            {a}
          </Badge>
        ))}
      </div>
    </DataRow>
  )
}
