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
    <div className={cn("flex flex-col rounded-sm bg-card p-2 gap-8", className)}>
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
