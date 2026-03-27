import { useState } from 'react'
import { Button } from "@/components/shadcn/button"
import { getAssetsForQuery } from "@/data/api/asset-api"
import { DataTable } from "../shadcn/data-table"
import { useConstantsStore } from '@/data/store/constants-store'
import { InputWithClear } from '../custom/input-with-clear'
import { PopoverSearch } from '../custom/popover-search'
import { useModelStore } from '@/data/store/model-store'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'
import { SelectOptions } from '../custom/select-options'
import { useQueryStore } from '@/data/store/query-store'

export function QueryPage(): React.JSX.Element {
  const [loading, setLoading] = useState(false)

  const models = useModelStore((state) => state.models)
  const availabilityStatuses = useConstantsStore((state) => state.availabilityStatuses)
  const technicalStatuses = useConstantsStore((state) => state.technicalStatuses)
  const warehouses = useConstantsStore((state) => state.warehouses)
  const activeWarehouses = warehouses.filter(w => w.is_active)

  const assets = useQueryStore(state => state.assets)
  const model = useQueryStore(state => state.model)
  const meter = useQueryStore(state => state.meter)
  const availabilityStatus = useQueryStore(state => state.availabilityStatus)
  const technicalStatus = useQueryStore(state => state.technicalStatus)
  const warehouse = useQueryStore(state => state.warehouse)

  const setAssets = useQueryStore(state => state.setAssets)
  const setModel = useQueryStore(state => state.setModel)
  const setMeter = useQueryStore(state => state.setMeter)
  const setAvailabilityStatus = useQueryStore(state => state.setAvailabilityStatus)
  const setTechnicalStatus = useQueryStore(state => state.setTechnicalStatus)
  const setWarehouse = useQueryStore(state => state.setWarehouse)
  const setHasSearched = useQueryStore(state => state.setHasSearched)

  async function submitQuery() {
    setLoading(true)
    try {
      if (model) {
        setAssets(await getAssetsForQuery(model, meter, availabilityStatus, technicalStatus, warehouse))
        setHasSearched(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold p-2">
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

        <SelectOptions
          selection={availabilityStatus}
          onSelectionChange={setAvailabilityStatus}
          options={availabilityStatuses}
          getLabel={s => s.status}
          fieldLabel='Availability'
          anyAllowed={true}
          className='max-w-36'
        />

        <SelectOptions
          selection={technicalStatus}
          onSelectionChange={setTechnicalStatus}
          options={technicalStatuses}
          getLabel={s => s.status}
          fieldLabel='Testing Status'
          anyAllowed={true}
          className='max-w-36'
        />

        <SelectOptions
          selection={warehouse}
          onSelectionChange={setWarehouse}
          options={activeWarehouses}
          getLabel={w => w.city_code}
          fieldLabel='Warehouse'
          anyAllowed={true}
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
      <div hidden={!loading}>
        <span>Loading...</span>
      </div>
      <DataTable columns={createAssetSummaryColumns('search')} data={assets} />
    </div>
  )
}
