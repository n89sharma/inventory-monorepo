import { PageContent } from '@/components/app-layout/page-content'
import { CreateBrandModal } from '@/components/settings/create-brand-modal'
import { CreateModelModal } from '@/components/settings/create-model-modal'
import { modelTableColumns } from '@/components/settings/model-table-columns'
import { Button } from '@/components/shadcn/button'
import { DataTable } from '@/components/shadcn/data-table'
import { ColumnFacetFilter } from '@/components/shared/filters/column-facet-filter'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { useModelStore } from '@/data/store/model-store'
import { PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'

const MODEL_DEFAULT_SORT = { id: 'brand_name', desc: false }

export function CatalogSettingsPage(): React.JSX.Element {
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false)
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)

  const models = useModelStore((state) => state.models)
  const sortedModels = useMemo(
    () =>
      [...models].sort(
        (a, b) =>
          a.brand_name.localeCompare(b.brand_name) || a.model_name.localeCompare(b.model_name),
      ),
    [models],
  )

  return (
    <PageContent className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Catalog</h1>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setIsBrandModalOpen(true)} className="w-fit">
          <PlusIcon /> Add Brand
        </Button>
        <Button variant="secondary" onClick={() => setIsModelModalOpen(true)} className="w-fit">
          <PlusIcon /> Add Model
        </Button>
      </div>

      <h2 className="text-lg font-semibold">Models</h2>
      <DataTable
        columns={modelTableColumns}
        data={sortedModels}
        defaultSort={MODEL_DEFAULT_SORT}
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

      <CreateBrandModal open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen} />
      <CreateModelModal open={isModelModalOpen} onOpenChange={setIsModelModalOpen} />
    </PageContent>
  )
}
