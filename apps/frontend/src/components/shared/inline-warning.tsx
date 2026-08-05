import { WarningIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export function InlineWarning({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}): React.JSX.Element {
  return (
    <div
      className="flex items-start justify-between gap-2 rounded-lg border
        border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <div className="flex items-start gap-2">
        <WarningIcon className="mt-0.5 shrink-0" />
        <span>{children}</span>
      </div>
      {action}
    </div>
  )
}
