import { cn } from '@/lib/utils'

export function HorizontalField(
  {
    label,
    htmlFor,
    children,
    className,
  }: {
    label: string
    htmlFor?: string
    children: React.ReactNode
    className?: string
  }
) {
  return (
    <div className={cn('grid grid-cols-[120px_1fr] items-center gap-3', className)}>
      <label
        htmlFor={htmlFor}
        className='text-sm font-medium text-foreground'
      >
        {label}
      </label>
      <div className='min-w-0'>{children}</div>
    </div>
  )
}
