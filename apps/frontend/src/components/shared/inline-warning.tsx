import { cn } from '@/lib/utils'
import { WarningIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

const CALLOUT_BASE = 'flex items-start justify-between gap-2 rounded-lg border px-2 py-1 text-sm'

const WARNING_TONE = 'border-destructive/30 bg-destructive/10 text-destructive'

export const CAUTION_TONE = 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'

export const SUCCESS_TONE = 'border-green-600/30 bg-green-500/10 text-green-800 dark:text-green-300'

export function InlineCallout({
  children,
  action,
  icon,
  toneClassName,
  align = 'start',
  className,
}: {
  children: ReactNode
  action?: ReactNode
  icon: ReactNode
  toneClassName: string
  align?: 'start' | 'center'
  className?: string
}): React.JSX.Element {
  return (
    <div className={cn(CALLOUT_BASE, toneClassName, className)}>
      <div className={cn('flex gap-2', align === 'center' ? 'items-center' : 'items-start')}>
        {icon}
        <span>{children}</span>
      </div>
      {action}
    </div>
  )
}

export function InlineWarning({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}): React.JSX.Element {
  return (
    <InlineCallout
      action={action}
      icon={<WarningIcon className="mt-0.5 shrink-0" />}
      toneClassName={WARNING_TONE}
    >
      {children}
    </InlineCallout>
  )
}

export function InlineCaution({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}): React.JSX.Element {
  return (
    <InlineCallout
      action={action}
      icon={<WarningIcon className="mt-0.5 shrink-0" />}
      toneClassName={CAUTION_TONE}
    >
      {children}
    </InlineCallout>
  )
}
