import { Button } from '@/components/shadcn/button'
import { DownloadSimpleIcon, SpinnerGapIcon } from '@phosphor-icons/react'

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
      {loading ? <SpinnerGapIcon className="animate-spin" /> : <DownloadSimpleIcon />}
    </Button>
  )
}
