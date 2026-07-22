import { SpinnerGapIcon } from '@phosphor-icons/react'

export function PendingIcon({
  pending,
  children,
}: {
  pending: boolean
  children: React.ReactNode
}): React.JSX.Element {
  if (pending) return <SpinnerGapIcon className="animate-spin" />
  return <>{children}</>
}
