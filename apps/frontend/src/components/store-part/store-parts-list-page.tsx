import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { Button } from '@/components/shadcn/button'
import { ExportCsvButton } from '@/components/shared/export-csv-button'
import { InputWithClearInline } from '@/components/shared/input-with-clear'
import { CollectionPage } from '@/components/collections/collection-page'
import { StoreTransactionModal } from '@/components/store-part/store-transaction-modal'
import { StorePartSummaryStrip } from '@/components/store-part/store-part-summary-strip'
import { STORE_PART_COLUMNS } from '@/components/store-part/store-part-table-columns'
import {
  toColumnDefs,
  toSummaryCsvColumns,
  visibleSummaryColumns,
} from '@/components/table-columns/summary-column'
import { useCan } from '@/hooks/use-can'
import { preloadStorePartDetail, useStorePartsList } from '@/hooks/use-store-part'
import { toCsv } from '@/lib/csv'
import { downloadFile } from '@/lib/download-file'
import { useStoreSearchParam, useStoreWarehousesParam } from '@/lib/filters/hooks'
import { rankMatches } from '@/lib/rank-matches'
import { buildStorePartPath } from '@/lib/filters/serializers'
import { waitForNextPaint } from '@/lib/wait-for-next-paint'
import { PlusIcon } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { StorePart, StorePartSummary, Warehouse } from 'shared-types'

const CSV_MIME_TYPE = 'text/csv'
const FILENAME_DATE_FORMAT = 'yyyyMMdd'
const ALL_WAREHOUSES_LABEL = 'all'

function storePartSearchText(row: StorePartSummary): string {
  return `${row.part_number} ${row.description}`
}

function storePartHref(row: StorePartSummary): string {
  return buildStorePartPath(row.id, row.warehouse_id)
}

// The warehouse codes are what actually scopes the file, so they stand in for the
// date range other exports carry.
function storeExportFilename(warehouses: Warehouse[], exportedAt: Date): string {
  const scope =
    warehouses.length > 0 ? warehouses.map((w) => w.city_code).join('-') : ALL_WAREHOUSES_LABEL
  return `store-${scope}-${format(exportedAt, FILENAME_DATE_FORMAT)}.csv`
}

export function StorePartsListPage(): React.JSX.Element {
  const [warehouses, setWarehouses] = useStoreWarehousesParam()
  const [search, setSearch] = useStoreSearchParam()

  const { data: rows = [] } = useStorePartsList()
  const [addOpen, setAddOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const can = useCan()
  const visibleColumns = useMemo(() => visibleSummaryColumns(STORE_PART_COLUMNS, can), [can])
  const columns = useMemo(
    () => toColumnDefs(visibleColumns, { getHref: storePartHref }),
    [visibleColumns],
  )

  const selectedWarehouseIds = useMemo(() => new Set(warehouses.map((w) => w.id)), [warehouses])

  // The stock value total answers "what is sitting in this warehouse", so it
  // follows the warehouse filter but deliberately ignores the search box. The
  // export uses the same rows so the CSV always reconciles with the strip.
  const warehouseRows = useMemo(
    () =>
      selectedWarehouseIds.size > 0
        ? rows.filter((row) => selectedWarehouseIds.has(row.warehouse_id))
        : rows,
    [rows, selectedWarehouseIds],
  )

  const filteredRows = useMemo(
    () => rankMatches(warehouseRows, search, storePartSearchText),
    [warehouseRows, search],
  )

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

  async function handleExport() {
    if (warehouseRows.length === 0) return
    setExportLoading(true)
    try {
      await waitForNextPaint()
      const csv = toCsv(toSummaryCsvColumns(visibleColumns), warehouseRows)
      downloadFile(
        storeExportFilename(warehouses, new Date()),
        new Blob([csv], { type: CSV_MIME_TYPE }),
      )
    } catch {
      toast.error('Failed to export store parts', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <>
      <CollectionPage<StorePartSummary, unknown>
        title="Store"
        columns={columns}
        data={filteredRows}
        summaryStrip={<StorePartSummaryStrip rows={warehouseRows} />}
        defaultSort={{ id: 'on_hand', desc: true }}
        onRowMouseEnter={(row) => preloadStorePartDetail(row.id)}
        getRowHref={storePartHref}
        actions={
          <div className="flex items-center gap-2">
            <ExportCsvButton
              loading={exportLoading}
              disabled={warehouseRows.length === 0 || exportLoading}
              onClick={handleExport}
            />
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
          </div>
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
