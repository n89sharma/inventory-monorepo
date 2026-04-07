import { Badge } from "@/components/shadcn/badge"
import { Checkbox } from "@/components/shadcn/checkbox"
import { CopyButton } from "@/components/custom/copy-button"
import { formatDate, formatUSD } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { Link } from "react-router-dom"
import { type Error } from "shared-types"

type ChildrenProps = {
  children: React.ReactNode
  className?: string
}

type SectionHeaderProps = {
  title: string,
  className?: string
}

type TitleProps = {
  brand: string | undefined,
  model: string | undefined,
  barcode: string | undefined,
  className?: string
}

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

export function DetailsContainer({ children, className }: ChildrenProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col rounded-sm border bg-card p-6 gap-8", className)}>
      {children}
    </div>
  )
}

export function SectionRow({ children, className }: ChildrenProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-row flex-wrap gap-20", className)}>
      {children}
    </div>
  )
}

export function Section({ children, className }: ChildrenProps): React.JSX.Element {
  return (
    <section className={cn("min-w-64", className)}>
      {children}
    </section>
  )
}

export function AssetTitle({ brand, model, barcode, className }: TitleProps): React.JSX.Element {
  return (
    <h1 className={cn("text-2xl font-semibold flex flex-col gap-1", className)}>
      <span className="group flex items-center gap-2">
        {barcode}
        <CopyButton value={barcode} />
      </span>
      <span className="group flex items-center gap-2">
        {`${brand} ${model}`}
        <CopyButton value={model} />
      </span>
    </h1>
  )
}

export function SectionHeader({ title, className }: SectionHeaderProps): React.JSX.Element {
  return (
    <h2 className={cn("text-xl font-semibold tracking-tight text-left", className)}>
      {title}
    </h2>
  )
}

export function DataRowContainer({ children, className }: ChildrenProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col", className)}>
      {children}
    </div>
  )
}

// Composable shell — label + arbitrary children in the value slot
export function DataRow({ label, children, className }: DataRowProps): React.JSX.Element {
  return (
    <div className={cn("flex items-center gap-4 py-1.5", className)}>
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
      <dd className="flex items-center gap-1 text-sm">
        {value != null && <span>$</span>}
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
      <dd className="text-sm">
        {value
          ? <Link to={to} className="text-primary hover:underline">{value}</Link>
          : '-'}
      </dd>
    </DataRow>
  )
}

// Date value row — formats Date internally, shows '-' for null/undefined
export function DataDateRow({ label, value, className }: DataDateRowProps): React.JSX.Element {
  return (
    <DataRow label={label} className={className}>
      <dd className="text-sm">
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
      <dd className="flex items-center gap-2 text-sm">
        <span className="flex items-center gap-1">
          <span className="text-cyan-500">C</span>
          <span className="tabular-nums">{c_value ?? 0}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-fuchsia-500">M</span>
          <span className="tabular-nums">{m_value ?? 0}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-yellow-500">Y</span>
          <span className="tabular-nums">{y_value ?? 0}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-foreground">K</span>
          <span className="tabular-nums">{k_value ?? 0}</span>
        </span>
      </dd>
    </DataRow>
  )
}

export function ErrorHeader({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn("flex border-b border-t-2 items-center py-0.5", className)}>
      <dt className={cn("text-sm text-muted-foreground min-w-28", className)}>Code</dt>
      <dd className={cn("text-sm text-muted-foreground", className)}>Fixed?</dd>
    </div>
  )
}

export function ErrorRow({ error, className }: ErrorRowProps): React.JSX.Element {
  return (
    <div className={cn("flex border-b py-0.5", className)}>
      <dt className={cn("text-left text-sm font-medium text-semibold min-w-28", className)}>
        {error.code}
      </dt>
      <dd className={cn("flex items-center gap-1 text-sm", className)}>
        <Checkbox id={error.code} checked={error.is_fixed} />
      </dd>
    </div>
  )
}

export function InvoiceClearedRow({ isCleared, className }: InvoiceClearedRowProps): React.JSX.Element {
  return (
    <DataRow label="Cleared?" className={className}>
      <dd className="flex items-center gap-1 text-sm">
        <Checkbox checked={isCleared} />
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

export function PartsHeader({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn("flex border-b border-t-2 items-center py-0.5", className)}>
      <dt className={cn("text-sm text-muted-foreground min-w-28", className)}>Part</dt>
      <dd className={cn("text-sm text-muted-foreground", className)}>Source</dd>
    </div>
  )
}

export function DataLabel({ label, className }: LabelProps): React.JSX.Element {
  return (
    <dt className={cn("text-left text-sm text-muted-foreground min-w-28", className)}>
      {label}
    </dt>
  )
}

export function DataValue({ value, className }: ValueProps): React.JSX.Element {
  return (
    <dd className={cn("text-sm", className)}>
      {value ?? '-'}
    </dd>
  )
}
