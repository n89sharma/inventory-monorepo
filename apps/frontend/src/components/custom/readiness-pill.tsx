import { cn } from '@/lib/utils'
import { getReadinessIconConfig } from './readiness-icon'

export const readinessPillClasses = cn(
  'inline-flex items-center gap-1 rounded-full border border-input bg-transparent',
  'h-5 px-2 py-0.5 text-xs font-medium'
)

export function ReadinessPillContent({ status }: { status: string }) {
  const { Icon, className, weight, display } = getReadinessIconConfig(status)
  return (
    <>
      <Icon size={12} weight={weight} className={className} />
      {display}
    </>
  )
}

export function ReadinessPill(
  { status, className }: { status: string | null | undefined; className?: string }
) {
  if (!status) return null
  return (
    <span className={cn(readinessPillClasses, className)}>
      <ReadinessPillContent status={status} />
    </span>
  )
}
