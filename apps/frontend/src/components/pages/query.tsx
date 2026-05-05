import { Button } from "@/components/shadcn/button"
import { getAssetsForQuery } from "@/data/api/asset-api"
import { useModelStore } from '@/data/store/model-store'
import { useQueryStore } from '@/data/store/query-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import type { RowSelectionState } from '@tanstack/react-table'
import { useState } from 'react'
import type { AssetSummary } from 'shared-types'
import { AddToCollectionModal } from '../modals/add-to-collection-modal'
import { InputWithClear } from '../custom/input-with-clear'
import { MultiSelectOptions } from '../custom/multi-select-options'
import { PopoverSearch } from '../custom/popover-search'
import { DataTable } from "../shadcn/data-table"
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

const searchColumns = createAssetSummaryColumns('search')
const getAssetRowId = (row: AssetSummary) => row.barcode

function QueryResultsTable({ assets }: { assets: AssetSummary[] }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [prevAssets, setPrevAssets] = useState(assets)
  const [addToOpen, setAddToOpen] = useState(false)
  const [frozenAssets, setFrozenAssets] = useState<AssetSummary[]>([])

  if (assets !== prevAssets) {
    setPrevAssets(assets)
    setRowSelection({})
  }

  const selectedCount = Object.keys(rowSelection).length

  function openAddTo() {
    setFrozenAssets(assets.filter(a => rowSelection[a.barcode]))
    setAddToOpen(true)
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
          {selectedCount} asset{selectedCount !== 1 ? 's' : ''} selected
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            Clear
          </Button>
          <Button size="sm" variant="secondary" onClick={openAddTo}>
            Add to
          </Button>
        </div>
      ) : null}
      <DataTable
        columns={searchColumns}
        data={assets}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={getAssetRowId}
      />
      <AddToCollectionModal
        open={addToOpen}
        onOpenChange={setAddToOpen}
        selectedAssets={frozenAssets}
        onConfirmSuccess={() => setRowSelection({})}
      />
    </div>
  )
}

export function QueryPage(): React.JSX.Element {
  const [loading, setLoading] = useState(false)

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

  const setAssets = useQueryStore(state => state.setAssets)
  const setModel = useQueryStore(state => state.setModel)
  const setMeter = useQueryStore(state => state.setMeter)
  const setAvailabilityStatuses = useQueryStore(state => state.setAvailabilityStatuses)
  const setTechnicalStatuses = useQueryStore(state => state.setTechnicalStatuses)
  const setSelectedWarehouses = useQueryStore(state => state.setSelectedWarehouses)
  const setHasSearched = useQueryStore(state => state.setHasSearched)

  async function submitQuery() {
    setLoading(true)
    try {
      if (model) {
        setAssets(await getAssetsForQuery(model, meter, availabilityStatuses, technicalStatuses, selectedWarehouses))
        setHasSearched(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold p-2">
        Search
      </h1>
      <form
        className="flex flex-row gap-2 border rounded-md p-2 items-end"
        onSubmit={e => e.preventDefault()}
      >

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
      </form>
      <div hidden={!loading} role="status" aria-live="polite">
        <span>Loading…</span>
      </div>
      <QueryResultsTable assets={assets} />
    </div>
  )
}
