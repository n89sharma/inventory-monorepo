import type { ReactNode } from 'react'

interface AddAssetBarShellProps {
  label: string
  children: ReactNode
}

export function AddAssetBarShell({ label, children }: AddAssetBarShellProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card p-2">
      <span className="pr-2 mr-2 border-r text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-1 items-center gap-2">{children}</div>
    </div>
  )
}
