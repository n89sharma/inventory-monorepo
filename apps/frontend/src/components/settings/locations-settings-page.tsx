import { PageContent } from '@/components/app-layout/page-content'
import { locationTableColumns } from '@/components/settings/location-table-columns'
import { Button } from '@/components/shadcn/button'
import { DataTable } from '@/components/shadcn/data-table'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { createSelectColumn } from '@/components/table-columns/shared-columns'
import { printLocationBarcodes } from '@/data/api/location-api'
import { useLocations } from '@/hooks/use-locations'
import { BarcodeIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { RowSelectionState } from '@tanstack/react-table'
import type { LocationSummary } from 'shared-types'

const LOCATION_DEFAULT_SORT = { id: 'warehouse_code', desc: false }
const LOCATION_PIN_LEFT = ['select', 'warehouse_code']
const EMPTY_LOCATIONS: LocationSummary[] = []

export function LocationsSettingsPage(): React.JSX.Element {
  const { data: locations = EMPTY_LOCATIONS } = useLocations()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [printLoading, setPrintLoading] = useState(false)

  const columns = useMemo(
    () => [createSelectColumn<LocationSummary>(), ...locationTableColumns],
    [],
  )

  async function handlePrint() {
    const selectedIds = Object.keys(rowSelection)
      .filter((id) => rowSelection[id])
      .map(Number)
    const ids = selectedIds.length ? selectedIds : locations.map((location) => location.id)

    if (!ids.length) {
      toast.error('No locations to print', { position: 'top-center' })
      return
    }

    setPrintLoading(true)
    try {
      await printLocationBarcodes(ids)
    } catch {
      toast.error('Failed to print location barcodes', { position: 'top-center' })
    } finally {
      setPrintLoading(false)
    }
  }

  return (
    <PageContent className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Locations</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrint}
          disabled={printLoading}
          aria-label="Print location barcodes"
        >
          {printLoading ? <SpinnerGapIcon className="animate-spin" /> : <BarcodeIcon />}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={locations}
        getRowId={(location) => String(location.id)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        pinLeft={LOCATION_PIN_LEFT}
        initialPageSize={50}
        defaultSort={LOCATION_DEFAULT_SORT}
        renderTableFilter={(table) => (
          <>
            <ColumnTextFilter
              table={table}
              columnId="warehouse_code"
              placeholder="Warehouse"
              clearLabel="Clear warehouse"
              className="w-50"
            />
            <ColumnTextFilter
              table={table}
              columnId="zone"
              placeholder="Zone"
              clearLabel="Clear zone"
              className="w-50"
            />
            <ColumnTextFilter
              table={table}
              columnId="bin"
              placeholder="Bin"
              clearLabel="Clear bin"
              className="w-50"
            />
          </>
        )}
      />
    </PageContent>
  )
}
