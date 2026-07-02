import { AddAssetBarShell } from '@/components/shared-collection-components/add-asset-bar-shell'
import { PlusIcon } from '@phosphor-icons/react'
import { Button } from '../shadcn/button'

interface AddAssetBarForArrivalProps {
  onCreate: () => void
  disabled?: boolean
}

export function AddAssetBarForArrival({
  onCreate,
  disabled,
}: AddAssetBarForArrivalProps): React.JSX.Element {
  return (
    <AddAssetBarShell label="New asset">
      <Button
        type="button"
        variant="secondary"
        onClick={onCreate}
        disabled={disabled}
        className="ml-auto"
      >
        <PlusIcon />
        Create Asset
      </Button>
    </AddAssetBarShell>
  )
}
