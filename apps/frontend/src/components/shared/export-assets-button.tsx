import { Button } from '@/components/shadcn/button'
import { PendingIcon } from '@/components/shared/pending-icon'
import { DownloadSimpleIcon } from '@phosphor-icons/react'

export function ExportAssetsButton({
  loading,
  disabled,
  onClick,
}: {
  loading: boolean
  disabled: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label="Export to CSV"
    >
      <PendingIcon pending={loading}>
        <DownloadSimpleIcon />
      </PendingIcon>
    </Button>
  )
}
