import { WarehouseFilter } from "@/components/filters/warehouse-filter"
import { AddPurchaseModal } from "@/components/modals/add-purchase-modal"
import { CollectionPage } from "@/components/pages/collection-page"
import { storePartTableColumns } from "@/components/pages/column-defs/store-part-columns"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { preloadStorePartDetail, useStorePartsList } from "@/hooks/use-store-part"
import { filtersToParams, paramsToFilters, type StoreFilters } from "@/lib/search-store-params"
import { PlusIcon } from "@phosphor-icons/react"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { StorePart, StorePartSummary } from "shared-types"

export function StorePartsListPage(): React.JSX.Element {
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(
    () => paramsToFilters(searchParams, warehouses),
    [searchParams, warehouses],
  )

  const { data: rows = [] } = useStorePartsList()
  const [addOpen, setAddOpen] = useState(false)

  const selectedWarehouseIds = useMemo(
    () => new Set(filters.warehouses.map(w => w.id)),
    [filters.warehouses],
  )

  const filteredRows = useMemo(() => {
    const needle = filters.search.trim().toLowerCase()
    return rows.filter(row => {
      if (selectedWarehouseIds.size > 0 && !selectedWarehouseIds.has(row.warehouse_id)) {
        return false
      }
      if (!needle) return true
      return row.part_number.toLowerCase().includes(needle)
        || row.description.toLowerCase().includes(needle)
    })
  }, [rows, selectedWarehouseIds, filters.search])

  const allParts = useMemo<StorePart[]>(() => {
    const byId = new Map<number, StorePart>()
    for (const row of rows) {
      if (!byId.has(row.id)) {
        byId.set(row.id, { id: row.id, part_number: row.part_number, description: row.description })
      }
    }
    return [...byId.values()]
  }, [rows])

  const targetWarehouse = filters.warehouses.length === 1 ? filters.warehouses[0] : null

  function updateFilters(next: StoreFilters) {
    setSearchParams(filtersToParams(next), { replace: true })
  }

  return (
    <>
      <CollectionPage<StorePartSummary, unknown>
        title="Store"
        columns={storePartTableColumns}
        data={filteredRows}
        defaultSort={{ id: 'on_hand', desc: true }}
        onRowMouseEnter={row => preloadStorePartDetail(row.part_number)}
        getRowHref={row => `/store/${row.part_number}?warehouse=${row.warehouse_id}`}
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
            <WarehouseFilter
              selection={filters.warehouses}
              onSelectionChange={selected => updateFilters({ ...filters, warehouses: selected })}
            />
            <Input
              value={filters.search}
              onChange={e => updateFilters({ ...filters, search: e.target.value })}
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
