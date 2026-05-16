import { StickyPageHeader } from "@/components/custom/sticky-page-header"
import { PageContent } from "@/components/layout/page-content"
import { DataTable } from "@/components/shadcn/data-table"
import type { ColumnDef } from "@tanstack/react-table"

interface CollectionPageProps<TData, TValue> {
  title: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchBar: React.ReactNode
  actions?: React.ReactNode
  onRowMouseEnter?: (row: TData) => void
}

export function CollectionPage<TData, TValue>({ title, columns, data, searchBar, actions, onRowMouseEnter }: CollectionPageProps<TData, TValue>) {
  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {actions}
        </div>
        {searchBar}
      </StickyPageHeader>
      <PageContent className="flex flex-col gap-2">
        <DataTable
          columns={columns}
          data={data}
          onRowMouseEnter={onRowMouseEnter}
          defaultSort={{ id: 'created_at', desc: true }}
        />
      </PageContent>
    </>
  )
}
