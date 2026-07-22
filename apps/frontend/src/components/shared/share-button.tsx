import { cn } from '@/lib/utils'
import { CheckIcon, ShareNetworkIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../shadcn/button'

type ShareButtonProps = {
  className?: string
}

function ShareStateIcon({ shared }: { shared: boolean }): React.JSX.Element {
  if (shared) return <CheckIcon />
  return <ShareNetworkIcon />
}

export function ShareButton({ className }: ShareButtonProps): React.JSX.Element {
  const [shared, setShared] = useState(false)

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setShared(true)
    setTimeout(() => setShared(false), 1000)
  }

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className={cn(className)}
      aria-label="Copy page URL"
    >
      <ShareStateIcon shared={shared} />
    </Button>
  )
}
