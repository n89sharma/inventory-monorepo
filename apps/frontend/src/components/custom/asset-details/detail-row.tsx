import { CopyButton } from "@/components/custom/copy-button"
import { Badge } from "@/components/shadcn/badge"
import { Checkbox } from "@/components/shadcn/checkbox"
import { formatDate, formatUSD } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { CurrencyDollarIcon } from "@phosphor-icons/react"
import { Link } from "react-router-dom"
import { type Error } from "shared-types"

type CMYKDataProps = {
  label: string,
  c_value: number | undefined | null,
  m_value: number | undefined | null,
  y_value: number | undefined | null,
  k_value: number | undefined | null,
  className?: string
}

type ErrorRowProps = {
  error: Error,
  className?: string
}

type InvoiceClearedRowProps = {
  isCleared: boolean,
  className?: string
}

type AccessoryDataProps = {
  label: string,
  accessories: string[],
  className?: string
}

type DataRowProps = {
  label: string,
  children: React.ReactNode,
  className?: string
}

type DataValueRowProps = {
  label: string,
  value: string | number | undefined | null,
  className?: string
}

type DataCurrencyRowProps = {
  label: string,
  value: number | null | undefined,
  className?: string
}

type DataLinkRowProps = {
  label: string,
  value: string | undefined | null,
  to: string,
  className?: string
}

type DataDateRowProps = {
  label: string,
  value: Date | null | undefined,
  className?: string
}

type LabelProps = {
  label: string,
  className?: string
}

type ValueProps = {
  value: string | number | undefined | null,
  className?: string
}

export function DataLabel({ label, className }: LabelProps): React.JSX.Element {
  return (
    <dt className={cn("text-left text-muted-foreground min-w-28", className)}>
      {label}
    </dt>
  )
}

export function DataValue({ value, className }: ValueProps): React.JSX.Element {
  const valuePresent =
    (typeof value === 'string' && value.length > 0) ||
    (value)

  return (
    <dd className={cn("min-w-0 wrap-break-words", className)}>
      {valuePresent ? value : '-'}
    </dd>
  )
}

// Composable shell — label + arbitrary children in the value slot
export function DataRow({ label, children, className }: DataRowProps): React.JSX.Element {
  return (
    <div className={cn("flex items-start gap-4 py-1.5 text-sm", className)}>
      <DataLabel label={label} />
      {children}
    </div>
  )
}

// Plain text value row
export function DataValueRow({ label, value, className }: DataValueRowProps): React.JSX.Element {
  return (
    <DataRow label={label} className={className}>
      <DataValue value={value} />
    </DataRow>
  )
}

// Currency value row — formats number internally, shows '-' for null/undefined
export function DataCurrencyRow({ label, value, className }: DataCurrencyRowProps): React.JSX.Element {
  return (
    <DataRow label={label} className={className}>
      <dd className="flex min-w-0 items-center gap-1">
        {value != null && <span><CurrencyDollarIcon /></span>}
        <span className="tabular-nums text-right w-20">
          {value != null ? formatUSD(value) : '-'}
        </span>
      </dd>
    </DataRow>
  )
}

// Link value row
export function DataLinkRow({ label, value, to, className }: DataLinkRowProps): React.JSX.Element {
  return (
    <DataRow label={label} className={className}>
      <dd className="group flex min-w-0 items-center gap-2">
        {value
          ? <Link to={to} className="text-primary hover:underline wrap-break-words min-w-0">{value}</Link>
          : '-'}
        {value && <CopyButton value={value} />}
      </dd>
    </DataRow>
  )
}

// Date value row — formats Date internally, shows '-' for null/undefined
export function DataDateRow({ label, value, className }: DataDateRowProps): React.JSX.Element {
  return (
    <DataRow label={label} className={className}>
      <dd>
        {value ? formatDate(value) : '-'}
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
  className
}: CMYKDataProps): React.JSX.Element {
  return (
    <DataRow label={label} className={className}>
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
  className
}: AccessoryDataProps): React.JSX.Element {
  return (
    <DataRow label={label} className={className}>
      <div className="grid grid-cols-2">
        {accessories.map(a => (
          <Badge variant="outline" key={a}>{a}</Badge>
        ))}
      </div>
    </DataRow>
  )
}

export function InvoiceClearedRow({ isCleared, className }: InvoiceClearedRowProps): React.JSX.Element {
  return (
    <DataRow label="Cleared?" className={className}>
      <dd className="flex min-w-0 items-center gap-1">
        <Checkbox checked={isCleared} />
      </dd>
    </DataRow>
  )
}

export function ErrorHeader({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn("flex border-b border-t-2 items-center py-0.5 text-sm", className)}>
      <dt className={cn("text-muted-foreground min-w-28", className)}>Code</dt>
      <dd className={cn("text-muted-foreground", className)}>Fixed?</dd>
    </div>
  )
}

export function ErrorRow({ error, className }: ErrorRowProps): React.JSX.Element {
  return (
    <div className={cn("flex border-b py-0.5 text-sm", className)}>
      <dt className={cn("text-left font-medium text-semibold min-w-28", className)}>
        {error.code}
      </dt>
      <dd className={cn("flex items-center gap-1", className)}>
        <Checkbox id={error.code} checked={error.is_fixed} />
      </dd>
    </div>
  )
}

export function PartsHeader({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn("flex items-center py-0.5 text-sm", className)}>
      <dt className={cn("text-muted-foreground min-w-28", className)}>Part</dt>
      <dd className={cn("text-muted-foreground", className)}>Source</dd>
    </div>
  )
}
