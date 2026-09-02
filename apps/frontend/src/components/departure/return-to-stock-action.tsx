import { Button } from '@/components/shadcn/button'
import { ReturnToStockDialog } from '@/components/departure/return-to-stock-dialog'
import { useCan } from '@/hooks/use-can'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react'
import { useState } from 'react'

type ReturnToStockActionProps = {
  assetCount: number
  onConfirm: () => void
}

export function ReturnToStockAction({
  assetCount,
  onConfirm,
}: ReturnToStockActionProps): React.ReactNode {
  const canReturnToStock = useCan('return_to_stock')
  const [open, setOpen] = useState(false)
  if (!canReturnToStock) return null

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <ArrowUUpLeftIcon />
        Return to Stock
      </Button>
      <ReturnToStockDialog
        assetCount={assetCount}
        open={open}
        onOpenChange={setOpen}
        onConfirm={onConfirm}
      />
    </>
  )
}
