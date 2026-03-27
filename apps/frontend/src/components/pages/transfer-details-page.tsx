import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { getAssetsForTransfers } from '@/data/api/asset-api'
import { useNavigationStore } from '@/data/store/navigation-store'
import type { AssetSummary } from 'shared-types'
import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { DataTable } from '../shadcn/data-table'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

export function TransferDetailsPage(): React.JSX.Element {
  const [assets, setAssets] = useState<AssetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId } = useParams<{ collectionId: string }>()
  const { pathname } = useLocation()

  if (collectionId === undefined) throw new Error('Missing collectionId parameter')

  const columns = createAssetSummaryColumns('transfers', collectionId)

  useEffect(() => {
    setLastPath('transfers', pathname)

    async function load() {
      setLoading(true)
      try {
        setAssets(await getAssetsForTransfers(collectionId!))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [collectionId])

  if (loading) return <div>Loading...</div>

  return (
    <div className="flex flex-col gap-2">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('transfers', collectionId)} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">Transfer {collectionId}</h1>
        <CollectionEditBar section="transfers" collectionId={collectionId} />
      </div>
      <DataTable columns={columns} data={assets} />
    </div>
  )
}
