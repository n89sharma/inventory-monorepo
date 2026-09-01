import { brandTableColumns } from '@/components/settings/brand-table-columns'
import { CreateBrandModal } from '@/components/settings/create-brand-modal'
import { SettingsListPage } from '@/components/settings/settings-list-page'
import { Button } from '@/components/shadcn/button'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { useBrands } from '@/hooks/use-reference-data'
import { PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'

const TABLE_LABEL = 'Brands'

const BRAND_DEFAULT_SORT = { id: 'name', desc: false }

export function BrandsSettingsPage(): React.JSX.Element {
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false)

  const brands = useBrands()
  const sortedBrands = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name)),
    [brands],
  )

  return (
    <>
      <SettingsListPage
        title="Brands"
        label={TABLE_LABEL}
        columns={brandTableColumns}
        data={sortedBrands}
        defaultSort={BRAND_DEFAULT_SORT}
        actions={
          <Button onClick={() => setIsBrandModalOpen(true)}>
            <PlusIcon /> Add Brand
          </Button>
        }
        renderTableFilter={(table) => (
          <ColumnTextFilter
            table={table}
            columnId="name"
            placeholder="Name"
            clearLabel="Clear name"
            className="w-50"
          />
        )}
      />

      <CreateBrandModal open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen} />
    </>
  )
}
