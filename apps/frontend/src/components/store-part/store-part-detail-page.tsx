import { PageContent } from '@/components/app-layout/page-content'
import { Button } from '@/components/shadcn/button'
import { DataTable } from '@/components/shared/data-table'
import { StickyDetailsPageHeader } from '@/components/collections/sticky-details-page-header'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { StoreTransactionModal } from '@/components/store-part/store-transaction-modal'
import { storeTransactionLedgerColumns } from '@/components/store-part/store-transaction-ledger-columns'
import { useStorePartDetail } from '@/hooks/use-store-part'
import { useStoreWarehousesParam } from '@/lib/filters/hooks'
import { buildStorePartsPathByWarehouseId } from '@/lib/filters/serializers'
import { PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { StorePartWarehouseStock } from 'shared-types'

// No warehouse selected means every warehouse, matching the ledger the page shows.
function onHandIn(stock: StorePartWarehouseStock[], warehouseId: number | null): number {
  if (warehouseId === null) return stock.reduce((sum, entry) => sum + entry.on_hand, 0)
  return stock.find((entry) => entry.warehouse_id === warehouseId)?.on_hand ?? 0
}

export function StorePartDetailPage(): React.JSX.Element {
  const { partId = '' } = useParams()
  const [scopeWarehouses] = useStoreWarehousesParam()
  const [addOpen, setAddOpen] = useState(false)

  const warehouse = scopeWarehouses[0] ?? null
  const warehouseId = warehouse?.id ?? null

  const { data, isLoading } = useStorePartDetail(Number(partId))

  const ledgerRows = useMemo(() => {
    const transactions = data?.transactions ?? []
    return warehouseId === null
      ? transactions
      : transactions.filter((t) => t.warehouse_id === warehouseId)
  }, [data, warehouseId])

  if (isLoading) {
    return (
      <PageContent>
        <p className="text-muted-foreground">Loading…</p>
      </PageContent>
    )
  }

  if (!data) {
    return (
      <PageContent>
        <p className="text-muted-foreground">Part not found.</p>
      </PageContent>
    )
  }

  const onHand = onHandIn(data.stock, warehouseId)
  const onHandLabel = warehouse ? `On hand (${warehouse.city_code})` : 'On hand'
  const backHref = buildStorePartsPathByWarehouseId(warehouseId)

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={[{ label: 'Store', href: backHref }]}
        title={data.part_number}
        copyValue={data.part_number}
        actions={
          <Button
            onClick={() => setAddOpen(true)}
            disabled={!warehouse}
            title={warehouse ? undefined : 'Open from a warehouse to record a transaction'}
          >
            <PlusIcon aria-hidden="true" />
            Transaction
          </Button>
        }
        subtitle={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <SummaryField label="Description" value={data.description} />
            <SummaryField label={onHandLabel} value={String(onHand)} />
          </div>
        }
      />
      <PageContent>
        <DataTable
          columns={storeTransactionLedgerColumns}
          data={ledgerRows}
          defaultSort={{ id: 'created_at', desc: true }}
        />
      </PageContent>
      {warehouse && (
        <StoreTransactionModal
          open={addOpen}
          onOpenChange={setAddOpen}
          warehouseId={warehouse.id}
          warehouseLabel={warehouse.city_code}
          allParts={[]}
          lockedPart={{ id: data.id, part_number: data.part_number, description: data.description }}
          onHandByPartId={{ [data.id]: onHand }}
        />
      )}
    </>
  )
}
