import { SectionHeader } from '@/components/custom/asset-details/detail-layout'
import { CollectionHistoryList } from '@/components/custom/collection-history-list'
import { useCollectionHistory } from '@/hooks/use-collection-history'
import type { CollectionHistory } from 'shared-types'

type CollectionHistorySectionProps = {
  cacheKey: string
  fetcher: () => Promise<CollectionHistory>
}

export function CollectionHistorySection({ cacheKey, fetcher }: CollectionHistorySectionProps) {
  const { data, isLoading } = useCollectionHistory(cacheKey, fetcher)

  return (
    <div className="bg-card border rounded-md p-6">
      <SectionHeader title="History" />
      <div className="overflow-y-auto max-h-105 pr-1 mt-2">
        {isLoading
          ? <p className="text-sm text-muted-foreground">Loading…</p>
          : <CollectionHistoryList history={data ?? []} />
        }
      </div>
    </div>
  )
}
