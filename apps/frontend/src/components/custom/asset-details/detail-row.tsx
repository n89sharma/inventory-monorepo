import { Badge } from '@/components/shadcn/badge'
import { formatUSD } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { CurrencyDollarIcon } from '@phosphor-icons/react'

type CMYKDataProps = {
  label: string
  c_value: number | undefined | null
  m_value: number | undefined | null
  y_value: number | undefined | null
  k_value: number | undefined | null
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

export function CMYKRow({
  label,
  c_value,
  m_value,
  y_value,
  k_value,
  rowClassName,
}: CMYKDataProps): React.JSX.Element {
  return (
    <DataRow label={label} rowClassName={rowClassName}>
      <dd className="flex min-w-0 items-center gap-2">
        <span className="flex items-baseline">
          <span className="text-cyan-500 text-xs">C</span>
          <span className="tabular-nums">{c_value ?? 0}</span>
        </span>
        <span className="flex items-baseline">
          <span className="text-fuchsia-500 text-xs">M</span>
          <span className="tabular-nums">{m_value ?? 0}</span>
        </span>
        <span className="flex items-baseline">
          <span className="text-yellow-500 text-xs">Y</span>
          <span className="tabular-nums">{y_value ?? 0}</span>
        </span>
        <span className="flex items-baseline">
          <span className="text-foreground text-xs">K</span>
          <span className="tabular-nums">{k_value ?? 0}</span>
        </span>
      </dd>
    </DataRow>
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
