import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { Button } from '@/components/shadcn/button'
import { InputWithClearInline } from '@/components/shared/input-with-clear'
import { CollectionPage } from '@/components/collections/collection-page'
import { StoreTransactionModal } from '@/components/store-part/store-transaction-modal'
import { storePartTableColumns } from '@/components/store-part/store-part-table-columns'
import { preloadStorePartDetail, useStorePartsList } from '@/hooks/use-store-part'
import { useStoreSearchParam, useStoreWarehousesParam } from '@/lib/filters/hooks'
import { rankMatches } from '@/lib/rank-matches'
import { buildStorePartPath } from '@/lib/filters/serializers'
import { PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import type { StorePart, StorePartSummary } from 'shared-types'

function storePartSearchText(row: StorePartSummary): string {
  return `${row.part_number} ${row.description}`
}

export function StorePartsListPage(): React.JSX.Element {
  const [warehouses, setWarehouses] = useStoreWarehousesParam()
  const [search, setSearch] = useStoreSearchParam()

  const { data: rows = [] } = useStorePartsList()
  const [addOpen, setAddOpen] = useState(false)

  const selectedWarehouseIds = useMemo(() => new Set(warehouses.map((w) => w.id)), [warehouses])

  const filteredRows = useMemo(() => {
    const inWarehouse =
      selectedWarehouseIds.size > 0
        ? rows.filter((row) => selectedWarehouseIds.has(row.warehouse_id))
        : rows
    return rankMatches(inWarehouse, search, storePartSearchText)
  }, [rows, selectedWarehouseIds, search])

  const allParts = useMemo<StorePart[]>(() => {
    const byId = new Map<number, StorePart>()
    for (const row of rows) {
      if (!byId.has(row.id)) {
        byId.set(row.id, { id: row.id, part_number: row.part_number, description: row.description })
      }
    }
    return [...byId.values()]
  }, [rows])

  const targetWarehouse = warehouses.length === 1 ? warehouses[0] : null

  const onHandByPartId = useMemo<Record<number, number>>(() => {
    if (!targetWarehouse) return {}
    return Object.fromEntries(
      rows
        .filter((row) => row.warehouse_id === targetWarehouse.id)
        .map((row) => [row.id, row.on_hand]),
    )
  }, [rows, targetWarehouse])

  return (
    <>
      <CollectionPage<StorePartSummary, unknown>
        title="Store"
        columns={storePartTableColumns}
        data={filteredRows}
        defaultSort={{ id: 'on_hand', desc: true }}
        onRowMouseEnter={(row) => preloadStorePartDetail(row.id)}
        getRowHref={(row) => buildStorePartPath(row.id, row.warehouse_id)}
        actions={
          <Button
            onClick={() => setAddOpen(true)}
            disabled={!targetWarehouse}
            title={
              targetWarehouse ? undefined : 'Select a single warehouse to record a transaction'
            }
          >
            <PlusIcon aria-hidden="true" />
            Transaction
          </Button>
        }
        searchBar={
          <div className="flex flex-wrap items-center gap-3">
            <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
            <InputWithClearInline
              inputType="string"
              value={search}
              onValueChange={(val) => setSearch(typeof val === 'string' ? val : '')}
              fieldLabel="Search part number or description"
              className="max-w-xs"
            />
          </div>
        }
      />
      {targetWarehouse && (
        <StoreTransactionModal
          open={addOpen}
          onOpenChange={setAddOpen}
          warehouseId={targetWarehouse.id}
          warehouseLabel={targetWarehouse.city_code}
          allParts={allParts}
          onHandByPartId={onHandByPartId}
        />
      )}
    </>
  )
}
