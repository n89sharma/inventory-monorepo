import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { CollectionPage } from '@/components/collections/collection-page'
import { AddPurchaseModal } from '@/components/store-part/add-purchase-modal'
import { storePartTableColumns } from '@/components/store-part/store-part-table-columns'
import { preloadStorePartDetail, useStorePartsList } from '@/hooks/use-store-part'
import { useStoreSearchParam, useStoreWarehousesParam } from '@/lib/filters/hooks'
import { buildStorePartPath } from '@/lib/filters/serializers'
import { PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import type { StorePart, StorePartSummary } from 'shared-types'

export function StorePartsListPage(): React.JSX.Element {
  const [warehouses, setWarehouses] = useStoreWarehousesParam()
  const [search, setSearch] = useStoreSearchParam()

  const { data: rows = [] } = useStorePartsList()
  const [addOpen, setAddOpen] = useState(false)

  const selectedWarehouseIds = useMemo(() => new Set(warehouses.map((w) => w.id)), [warehouses])

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (selectedWarehouseIds.size > 0 && !selectedWarehouseIds.has(row.warehouse_id)) {
        return false
      }
      if (!needle) return true
      return (
        row.part_number.toLowerCase().includes(needle) ||
        row.description.toLowerCase().includes(needle)
      )
    })
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

  return (
    <>
      <CollectionPage<StorePartSummary, unknown>
        title="Store"
        columns={storePartTableColumns}
        data={filteredRows}
        defaultSort={{ id: 'on_hand', desc: true }}
        onRowMouseEnter={(row) => preloadStorePartDetail(row.part_number)}
        getRowHref={(row) => buildStorePartPath(row.part_number, row.warehouse_id)}
        actions={
          <Button
            onClick={() => setAddOpen(true)}
            disabled={!targetWarehouse}
            title={targetWarehouse ? undefined : 'Select a single warehouse to add a purchase'}
          >
            <PlusIcon aria-hidden="true" />
            Add Part
          </Button>
        }
        searchBar={
          <div className="flex flex-wrap items-center gap-3">
            <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search part number or description"
              className="max-w-xs"
            />
          </div>
        }
      />
      {targetWarehouse && (
        <AddPurchaseModal
          open={addOpen}
          onOpenChange={setAddOpen}
          warehouseId={targetWarehouse.id}
          warehouseLabel={targetWarehouse.city_code}
          allParts={allParts}
        />
      )}
    </>
  )
}
