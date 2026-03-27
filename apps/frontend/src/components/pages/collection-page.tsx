import { DataTable } from "@/components/shadcn/data-table"
import type { ColumnDef } from "@tanstack/react-table"

interface CollectionPageProps<TData, TValue> {
  title: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchBar: React.ReactNode
  actions?: React.ReactNode
}

export function CollectionPage<TData, TValue>({ title, columns, data, searchBar, actions }: CollectionPageProps<TData, TValue>) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">{title}</h1>
        {actions}
      </div>
      {searchBar}
      <DataTable columns={columns} data={data} />
    </div>
  )
}
