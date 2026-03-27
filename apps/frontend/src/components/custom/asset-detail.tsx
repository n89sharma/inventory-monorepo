import { Badge } from "@/components/shadcn/badge"
import { Checkbox } from "@/components/shadcn/checkbox"
import { cn } from "@/lib/utils"
import { type Error } from "shared-types"

type ChildrenProps = {
  children: React.ReactNode
  className?: string
}

type HeaderProps = {
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
  c_value: number | undefined,
  m_value: number | undefined,
  y_value: number | undefined,
  k_value: number | undefined,
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

type DataPointProps = {
  label: string,
  value: string | number | undefined | null,
  curr?: boolean,
  className?: string
}

type LabelProps = {
  label: string,
  className?: string
}

type ValueProps = {
  value: string | number | undefined | null,
  curr?: boolean,
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
    <div className={cn("flex flex-row flex-wrap gap-16", className)}>
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
    <h1 className={cn("text-3xl font-bold", className)}>
      {`${brand} ${model}`}
      <br></br>
      {barcode}
    </h1>
  )
}

export function Header({ title, className }: HeaderProps): React.JSX.Element {
  return (
    <h2 className={cn("text-2xl font-bold tracking-tight text-left", className)}>
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

export function DataRow({ label, value, curr = false, className }: DataPointProps): React.JSX.Element {
  return (
    <div className={cn("flex items-center gap-4 py-1.5 border-b first:border-t-2", className)}>
      <DataLabel label={label} />
      <DataValue value={value} curr={curr} />
    </div>
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
    <div className={cn("flex items-center gap-4 py-1.5 border-b", className)}>
      <DataLabel label={label} />
      <dd className="flex items-center gap-2 text-sm font-semibold">
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
    </div>
  )
}

export function ErrorHeader({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn("flex border-b border-t-2 items-center py-0.5", className)}>
      <dt className={cn("text-sm font-semibold text-muted-foreground min-w-28", className)}>Code</dt>
      <dd className={cn("text-sm font-semibold text-muted-foreground", className)}>Fixed?</dd>
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
    <div className={cn("flex items-center gap-4 py-1.5 border-b first:border-t-2", className)}>
      <dt className={cn("text-left text-sm font-medium text-muted-foreground min-w-[110px]", className)}>
        Cleared?
      </dt>
      <dd className={cn("flex items-center gap-1 text-sm", className)}>
        <Checkbox checked={isCleared} />
      </dd>
    </div>
  )
}

export function AccessoryRow({
  label,
  accessories,
  className }: AccessoryDataProps): React.JSX.Element {

  return (
    <div className={cn("flex items-center gap-4 py-1.5 border-b", className)}>
      <DataLabel label={label} />
      <div className="grid grid-cols-2">
        {accessories.map(a => (
          <Badge variant="outline" key={a}>{a}</Badge>
        ))}

      </div>
    </div>
  )
}

export function PartsHeader({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn("flex border-b border-t-2 items-center py-0.5", className)}>
      <dt className={cn("text-sm font-semibold text-muted-foreground min-w-[110px]", className)}>Part</dt>
      <dd className={cn("text-sm font-semibold text-muted-foreground", className)}>Source</dd>
    </div>
  )
}

export function DataLabel({ label, className }: LabelProps): React.JSX.Element {
  return (
    <dt className={cn("text-left text-sm font-medium text-muted-foreground min-w-[110px]", className)}>
      {label}
    </dt>
  )
}

export function DataValue({ value, curr = false, className }: ValueProps): React.JSX.Element {
  var formattedValue = value ?? "-"
  if (curr) {
    return (
      <dd className={cn("flex items-center gap-1 text-sm font-semibold", className)}>
        {value && <span>$</span>}
        <span className="tabular-nums text-right w-[80px]">{formattedValue}</span>
      </dd>
    )
  }

  return (
    <dd className={cn("text-sm font-semibold", className)}>
      {formattedValue}
    </dd>
  )

}