import { CreateModelModal } from '@/components/settings/create-model-modal'
import { modelTableColumns } from '@/components/settings/model-table-columns'
import { SettingsListPage } from '@/components/settings/settings-list-page'
import { Button } from '@/components/shadcn/button'
import { ColumnFacetFilter } from '@/components/shared/filters/column-facet-filter'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { useModels } from '@/hooks/use-model'
import { PlusIcon } from '@phosphor-icons/react'
import { getFacetedRowModel, getFacetedUniqueValues } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import type { ModelSummary } from 'shared-types'

const TABLE_LABEL = 'Models'

const MODEL_DEFAULT_SORT = { id: 'brand_name', desc: false }
const MODEL_FACETED_ROW_MODELS = {
  getFacetedRowModel: getFacetedRowModel<ModelSummary>(),
  getFacetedUniqueValues: getFacetedUniqueValues<ModelSummary>(),
}

export function ModelsSettingsPage(): React.JSX.Element {
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)

  const models = useModels()
  const sortedModels = useMemo(
    () =>
      [...models].sort(
        (a, b) =>
          a.brand_name.localeCompare(b.brand_name) || a.model_name.localeCompare(b.model_name),
      ),
    [models],
  )

  return (
    <>
      <SettingsListPage
        title="Models"
        label={TABLE_LABEL}
        columns={modelTableColumns}
        data={sortedModels}
        defaultSort={MODEL_DEFAULT_SORT}
        facetedRowModels={MODEL_FACETED_ROW_MODELS}
        actions={
          <Button onClick={() => setIsModelModalOpen(true)}>
            <PlusIcon /> Add Model
          </Button>
        }
        renderTableFilter={(table) => (
          <>
            <ColumnTextFilter
              table={table}
              columnId="brand_name"
              placeholder="Brand"
              clearLabel="Clear brand"
              className="w-50"
            />
            <ColumnTextFilter
              table={table}
              columnId="model_name"
              placeholder="Name"
              clearLabel="Clear name"
              className="w-50"
            />
            <ColumnFacetFilter
              table={table}
              columnId="asset_type"
              placeholder="Type"
              clearLabel="Clear type"
              className="w-50 rounded-lg bg-background"
            />
          </>
        )}
      />

      <CreateModelModal open={isModelModalOpen} onOpenChange={setIsModelModalOpen} />
    </>
  )
}
