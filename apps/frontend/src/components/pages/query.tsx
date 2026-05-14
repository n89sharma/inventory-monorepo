import { Button } from "@/components/shadcn/button"
import { useAssetStore } from '@/data/store/asset-store'
import { useModelStore } from '@/data/store/model-store'
import { useQueryStore } from '@/data/store/query-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { DownloadSimpleIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table'
import { useState } from 'react'
import type { AssetSummary } from 'shared-types'
import { toast } from 'sonner'
import { BulkEditBar } from '../custom/bulk-edit-bar'
import { InputWithClear } from '../custom/input-with-clear'
import { MultiSelectOptions } from '../custom/multi-select-options'
import { PopoverSearch } from '../custom/popover-search'
import { DataTable } from "../shadcn/data-table"
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

const searchColumns = createAssetSummaryColumns('search')
const getAssetRowId = (row: AssetSummary) => row.barcode

function QueryResultsTable({
  assets,
  rowSelection,
  onRowSelectionChange,
  onBulkPriceSave,
}: {
  assets: AssetSummary[]
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onBulkPriceSave: () => void
}) {
  const [prevAssets, setPrevAssets] = useState(assets)

  if (assets !== prevAssets) {
    setPrevAssets(assets)
    onRowSelectionChange({})
  }

  const selectedAssets = assets.filter(a => rowSelection[a.barcode])

  return (
    <div className="flex flex-col gap-2">
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => onRowSelectionChange({})}
        onPriceSaveSuccess={onBulkPriceSave}
      />
      <DataTable
        columns={searchColumns}
        data={assets}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        getRowId={getAssetRowId}
        defaultSort={{ id: 'barcode', desc: true }}
      />
    </div>
  )
}

export function QueryPage(): React.JSX.Element {
  const searchAssets = useQueryStore(state => state.searchAssets)
  const exportAssets = useAssetStore(state => state.exportAssets)
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const models = useModelStore((state) => state.models)
  const allAvailabilityStatuses = useReferenceDataStore((state) => state.availabilityStatuses)
  const allTechnicalStatuses = useReferenceDataStore((state) => state.technicalStatuses)
  const allWarehouses = useReferenceDataStore((state) => state.warehouses)
  const activeWarehouses = allWarehouses.filter(w => w.is_active)

  const assets = useQueryStore(state => state.assets)
  const model = useQueryStore(state => state.model)
  const meter = useQueryStore(state => state.meter)
  const availabilityStatuses = useQueryStore(state => state.availabilityStatuses)
  const technicalStatuses = useQueryStore(state => state.technicalStatuses)
  const selectedWarehouses = useQueryStore(state => state.selectedWarehouses)

  const setModel = useQueryStore(state => state.setModel)
  const setMeter = useQueryStore(state => state.setMeter)
  const setAvailabilityStatuses = useQueryStore(state => state.setAvailabilityStatuses)
  const setTechnicalStatuses = useQueryStore(state => state.setTechnicalStatuses)
  const setSelectedWarehouses = useQueryStore(state => state.setSelectedWarehouses)

  async function submitQuery() {
    setLoading(true)
    try {
      if (model) {
        await searchAssets(model, meter, availabilityStatuses, technicalStatuses, selectedWarehouses)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    const selectedBarcodes = Object.keys(rowSelection)
    const barcodesToExport = selectedBarcodes.length > 0
      ? selectedBarcodes
      : assets.map(a => a.barcode)

    if (barcodesToExport.length > 2000) {
      toast.error('Please select 2000 assets or less', { position: 'top-center' })
      return
    }

    setExportLoading(true)
    try {
      await exportAssets(barcodesToExport)
    } catch {
      toast.error('Failed to export assets', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  const exportDisabled = assets.length === 0 || exportLoading

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between p-2">
        <h1 className="text-2xl font-semibold">
          Search
        </h1>
        <Button
          variant="outline"
          size="icon"
          onClick={handleExport}
          disabled={exportDisabled}
          aria-label="Export to CSV"
        >
          {exportLoading
            ? <SpinnerGapIcon className="animate-spin" />
            : <DownloadSimpleIcon />}
        </Button>
      </div>
      <form
        className="flex flex-row gap-2 border rounded-md p-2 items-end"
        onSubmit={e => e.preventDefault()}
      >
        <fieldset disabled={exportLoading} className="contents">
          <PopoverSearch
            selection={model}
            onSelectionChange={setModel}
            onClear={() => setModel(null)}
            options={models}
            searchKey='model_name'
            getLabel={m => `${m.brand_name} ${m.model_name}`}
            fieldLabel='Model'
            fieldRequired={true}
          />

          <MultiSelectOptions
            selection={availabilityStatuses}
            onSelectionChange={setAvailabilityStatuses}
            options={allAvailabilityStatuses}
            getLabel={s => s.status}
            fieldLabel='Availability'
            className='max-w-36'
          />

          <MultiSelectOptions
            selection={technicalStatuses}
            onSelectionChange={setTechnicalStatuses}
            options={allTechnicalStatuses}
            getLabel={s => s.status}
            fieldLabel='Testing Status'
            className='max-w-36'
          />

          <MultiSelectOptions
            selection={selectedWarehouses}
            onSelectionChange={setSelectedWarehouses}
            options={activeWarehouses}
            getLabel={w => w.city_code}
            fieldLabel='Warehouse'
            className='max-w-36'
          />

          <InputWithClear
            value={meter}
            onValueChange={val => setMeter(typeof val === 'string' ? null : val)}
            fieldLabel='Meter'
            inputType='number'
            className='max-w-36'
          />

          <Button
            className="rounded-md"
            onClick={submitQuery}
            type="submit"
          >
            Search
          </Button>
        </fieldset>
      </form>
      <div hidden={!loading} role="status" aria-live="polite">
        <span>Loading…</span>
      </div>
      <QueryResultsTable
        assets={assets}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onBulkPriceSave={submitQuery}
      />
    </div>
  )
}
