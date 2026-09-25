import { createComponentTableColumns } from '@/components/settings/component-table-columns'
import { CreateComponentModal } from '@/components/settings/create-component-modal'
import { EditComponentModal } from '@/components/settings/edit-component-modal'
import { MergeComponentModal } from '@/components/settings/merge-component-modal'
import { SettingsListPage } from '@/components/settings/settings-list-page'
import { Button } from '@/components/shadcn/button'
import { ColumnFacetFilter } from '@/components/shared/filters/column-facet-filter'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { createSelectColumn } from '@/components/table-columns/column-primitives'
import { useCan } from '@/hooks/use-can'
import { useComponents } from '@/hooks/use-component'
import { ArrowsMergeIcon, PlusIcon } from '@phosphor-icons/react'
import { getFacetedRowModel, getFacetedUniqueValues } from '@tanstack/react-table'
import type { RowSelectionState } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import type { ComponentSummary } from 'shared-types'

const TABLE_LABEL = 'Components'

const COMPONENT_DEFAULT_SORT = { id: 'brand_name', desc: false }
const COMPONENT_PIN_LEFT = ['select']
const getComponentRowId = (component: ComponentSummary) => String(component.id)
const COMPONENT_FACETED_ROW_MODELS = {
  getFacetedRowModel: getFacetedRowModel<ComponentSummary>(),
  getFacetedUniqueValues: getFacetedUniqueValues<ComponentSummary>(),
}

export function ComponentsSettingsPage(): React.JSX.Element {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ComponentSummary | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)

  const canEdit = useCan('update_settings')
  const handleEdit = useCallback((component: ComponentSummary) => setEditTarget(component), [])
  const columns = useMemo(
    () => [
      createSelectColumn<ComponentSummary>(),
      ...createComponentTableColumns(canEdit ? handleEdit : undefined),
    ],
    [canEdit, handleEdit],
  )

  const components = useComponents()

  const selectedComponents = useMemo(
    () => components.filter((component) => rowSelection[String(component.id)]),
    [components, rowSelection],
  )
  const selectedBrandIds = new Set(selectedComponents.map((component) => component.brand_id))
  const mergeEnabled = selectedComponents.length > 1 && selectedBrandIds.size === 1

  return (
    <>
      <SettingsListPage
        title="Components"
        label={TABLE_LABEL}
        columns={columns}
        data={components}
        defaultSort={COMPONENT_DEFAULT_SORT}
        facetedRowModels={COMPONENT_FACETED_ROW_MODELS}
        getRowId={getComponentRowId}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        pinLeft={COMPONENT_PIN_LEFT}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsMergeModalOpen(true)}
              disabled={!mergeEnabled}
              title="Select two or more components of the same brand to merge"
            >
              <ArrowsMergeIcon /> Merge
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon /> Add Component
            </Button>
          </div>
        }
        renderToolbar={(table) => (
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
              columnId="name"
              placeholder="Name"
              clearLabel="Clear name"
              className="w-50"
            />
            <ColumnFacetFilter
              table={table}
              columnId="is_active"
              placeholder="Active"
              clearLabel="Clear active"
              className="w-50 rounded-lg bg-background"
            />
          </>
        )}
      />

      <CreateComponentModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      {isMergeModalOpen && (
        <MergeComponentModal
          open={isMergeModalOpen}
          onOpenChange={setIsMergeModalOpen}
          components={selectedComponents}
          onMerged={() => setRowSelection({})}
        />
      )}
      {editTarget && (
        <EditComponentModal
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
          component={editTarget}
        />
      )}
    </>
  )
}
