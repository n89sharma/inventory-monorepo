import { CopyButton } from "@/components/custom/copy-button"
import { cn } from "@/lib/utils"

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

export function DetailsContainer({ children, className }: ChildrenProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col rounded-md bg-card border p-6 gap-8", className)}>
      {children}
    </div>
  )
}

export function SectionRow({ children, className }: ChildrenProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-row flex-wrap gap-8", className)}>
      {children}
    </div>
  )
}

export function Section({ children, className }: ChildrenProps): React.JSX.Element {
  return (
    <section className={cn("w-64", className)}>
      {children}
    </section>
  )
}

export function AssetTitle({ brand, model, barcode, className }: TitleProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <h1 className="text-2xl font-semibold group flex items-center gap-2">
        {barcode}
        <CopyButton value={barcode} />
      </h1>
      <p className="text-lg group flex items-center gap-2">
        {`${brand} ${model}`}
        <CopyButton value={model} />
      </p>
    </div>
  )
}

export function SectionHeader({ title, className }: SectionHeaderProps): React.JSX.Element {
  return (
    <h2 className={cn(
      "text-base font-semibold tracking-tight mb-2",
      className
    )}>
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

export function ActivitySection({ children, className }: ChildrenProps): React.JSX.Element {
  return (
    <div className={cn("border-t pt-6", className)}>
      {children}
    </div>
  )
}
