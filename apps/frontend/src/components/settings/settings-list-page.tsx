import { GridPageContent } from '@/components/app-layout/page-content'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import { DataGrid } from '@/components/shared/data-table'
import { useTableSortParam } from '@/hooks/use-table-sort-param'
import type {
  ColumnDef,
  OnChangeFn,
  RowSelectionState,
  Table,
  TableOptions,
} from '@tanstack/react-table'

interface SettingsListPageProps<TData, TValue> {
  title: string
  label: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  actions?: React.ReactNode
  defaultSort: { id: string; desc: boolean }
  pinLeft?: string[]
  getRowId?: (row: TData) => string
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  facetedRowModels?: Pick<TableOptions<TData>, 'getFacetedRowModel' | 'getFacetedUniqueValues'>
  renderTableFilter?: (table: Table<TData>) => React.ReactNode
}

export function SettingsListPage<TData, TValue>({
  title,
  label,
  columns,
  data,
  actions,
  defaultSort,
  pinLeft,
  getRowId,
  rowSelection,
  onRowSelectionChange,
  facetedRowModels,
  renderTableFilter,
}: SettingsListPageProps<TData, TValue>) {
  const [sorting, onSortingChange] = useTableSortParam(defaultSort)
  return (
    <GridPageContent>
      <GridPageHeader>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {actions}
        </div>
      </GridPageHeader>
      <DataGrid
        label={label}
        columns={columns}
        data={data}
        defaultSort={defaultSort}
        pinLeft={pinLeft}
        getRowId={getRowId}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
        facetedRowModels={facetedRowModels}
        renderTableFilter={renderTableFilter}
      />
    </GridPageContent>
  )
}
