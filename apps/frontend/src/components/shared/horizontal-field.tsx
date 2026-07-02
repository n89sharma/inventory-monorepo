import { cn } from '@/lib/utils'

export function HorizontalField({
  label,
  htmlFor,
  required,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-[120px_1fr] items-center gap-3', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
