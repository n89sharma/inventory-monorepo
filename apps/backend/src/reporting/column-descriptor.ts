import type { Permission } from 'shared-types'

export type ColumnDescriptor<T> = {
  readonly key: string
  readonly header: string
  readonly accessor: (row: T) => unknown
  readonly format?: (val: unknown) => string | null
  readonly permission?: Permission
}
