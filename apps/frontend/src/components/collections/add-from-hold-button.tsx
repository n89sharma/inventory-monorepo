import { AddFromHoldModal } from '@/components/collections/add-from-hold-modal'
import { useState } from 'react'
import type { AssetSummary } from 'shared-types'
import { Button } from '../shadcn/button'

interface AddFromHoldButtonProps {
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
  disabled?: boolean
  onCommitBatch?: (assets: AssetSummary[]) => Promise<void>
}

export function AddFromHoldButton({
  getAssets,
  onAddAsset,
  disabled,
  onCommitBatch,
}: AddFromHoldButtonProps): React.JSX.Element {
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false)

  return (
    <>
      <Button
        variant="secondary"
        type="button"
        onClick={() => setIsHoldModalOpen(true)}
        disabled={disabled}
      >
        Add from Hold
      </Button>
      <AddFromHoldModal
        open={isHoldModalOpen}
        onOpenChange={setIsHoldModalOpen}
        getAssets={getAssets}
        onAddAsset={onAddAsset}
        onCommitBatch={onCommitBatch}
      />
    </>
  )
}
