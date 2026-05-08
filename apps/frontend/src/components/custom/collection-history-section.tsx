import { SectionHeader } from '@/components/custom/asset-details/detail-layout'

type CollectionHistorySectionProps = {
  children: React.ReactNode
}

export function CollectionHistorySection({ children }: CollectionHistorySectionProps) {
  return (
    <div className="bg-card border rounded-md p-6">
      <SectionHeader title="History" />
      <div className="overflow-y-auto max-h-105 pr-1 mt-2">
        {children}
      </div>
    </div>
  )
}
