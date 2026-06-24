import { SummaryField } from '@/components/custom/cards/summary-field'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { AddPurchaseModal } from '@/components/modals/add-purchase-modal'
import { storeTransactionLedgerColumns } from '@/components/pages/column-defs/store-part-columns'
import { PageContent } from '@/components/layout/page-content'
import { Button } from '@/components/shadcn/button'
import { DataTable } from '@/components/shadcn/data-table'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useStorePartDetail } from '@/hooks/use-store-part'
import { PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

export function StorePartDetailPage(): React.JSX.Element {
  const { partNumber = '' } = useParams()
  const [searchParams] = useSearchParams()
  const warehouses = useReferenceDataStore((state) => state.warehouses)
  const [addOpen, setAddOpen] = useState(false)

  const warehouseId = useMemo(() => {
    const raw = Number(searchParams.get('warehouse'))
    return Number.isNaN(raw) || raw === 0 ? null : raw
  }, [searchParams])

  const { data, isLoading } = useStorePartDetail(partNumber)

  const ledgerRows = useMemo(() => {
    const transactions = data?.transactions ?? []
    return warehouseId === null
      ? transactions
      : transactions.filter((t) => t.warehouse_id === warehouseId)
  }, [data, warehouseId])

  const onHand = useMemo(
    () => ledgerRows.reduce((sum, t) => sum + (t.is_inbound ? t.quantity : -t.quantity), 0),
    [ledgerRows],
  )

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

  const warehouse = warehouses.find((w) => w.id === warehouseId) ?? null
  const onHandLabel = warehouse ? `On hand (${warehouse.city_code})` : 'On hand'
  const backHref = warehouseId === null ? '/store' : `/store?warehouse=${warehouseId}`

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
            title={warehouse ? undefined : 'Open from a warehouse to add a purchase'}
          >
            <PlusIcon aria-hidden="true" />
            Add Part
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
        <AddPurchaseModal
          open={addOpen}
          onOpenChange={setAddOpen}
          warehouseId={warehouse.id}
          warehouseLabel={warehouse.city_code}
          allParts={[]}
          lockedPart={{ id: data.id, part_number: data.part_number, description: data.description }}
        />
      )}
    </>
  )
}
