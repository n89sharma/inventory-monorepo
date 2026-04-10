import { Organization } from '@/components/custom/cards/organization-card'
import { WarehouseCard } from '@/components/custom/cards/warehouse-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useTransferStore } from '@/data/store/transfer-store'
import { useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function TransferDetailsPage(): React.JSX.Element {
  const transfer = useTransferStore(state => state.transferDetail)
  const detailLoading = useTransferStore(state => state.detailLoading)
  const detailError = useTransferStore(state => state.detailError)
  const getTransferDetails = useTransferStore(state => state.getTransferDetails)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId: transferNumber } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (transferNumber === undefined) throw new Error('Missing collectionId/transferNumber parameter')

  const columns = useMemo(() => createAssetSummaryColumns('transfers', transferNumber), [transferNumber])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('transfers', pathname)
    getTransferDetails(transferNumber)
  }, [transferNumber])

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError}</div>
  if (!transfer) return <div>Transfer not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('transfers', transferNumber)} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold p-2">Transfer {transferNumber}</h1>
        <CollectionEditBar section="transfers" collectionId={transferNumber} />
      </div>
      <div className="flex gap-4">
        <WarehouseCard title="Origin" warehouse={transfer.origin} />
        <Organization title="Transporter" org={transfer.transporter} />
        <WarehouseCard title="Destination" warehouse={transfer.destination} />
      </div>
      <DataTable columns={columns} data={transfer.assets} />
    </div>
  )
}
