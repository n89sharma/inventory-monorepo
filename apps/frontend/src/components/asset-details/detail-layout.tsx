import { cn } from '@/lib/utils'

type ChildrenProps = {
  children: React.ReactNode
  className?: string
}

type SectionHeaderProps = {
  title: string
  className?: string
  action?: React.ReactNode
}

export function Section({ children, className }: ChildrenProps): React.JSX.Element {
  return <section className={cn('w-64', className)}>{children}</section>
}

export function SectionHeader({ title, className, action }: SectionHeaderProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-between mb-2', className)}>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  )
}

export function DataRowContainer({ children, className }: ChildrenProps): React.JSX.Element {
  return <div className={cn('flex flex-col', className)}>{children}</div>
}

export function ActivitySection({ children, className }: ChildrenProps): React.JSX.Element {
  return <div className={cn('border-t pt-6', className)}>{children}</div>
}
