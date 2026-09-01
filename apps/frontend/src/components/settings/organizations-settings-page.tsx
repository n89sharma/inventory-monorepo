import { CreateOrgModal } from '@/components/settings/create-org-modal'
import { orgTableColumns } from '@/components/settings/org-table-columns'
import { SettingsListPage } from '@/components/settings/settings-list-page'
import { Button } from '@/components/shadcn/button'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { useOrgs } from '@/hooks/use-org'
import { PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'

const TABLE_LABEL = 'Organizations'

const ORG_DEFAULT_SORT = { id: 'account_number', desc: false }

export function OrganizationsSettingsPage(): React.JSX.Element {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)

  const orgs = useOrgs()

  return (
    <>
      <SettingsListPage
        title="Organizations"
        label={TABLE_LABEL}
        columns={orgTableColumns}
        data={orgs}
        defaultSort={ORG_DEFAULT_SORT}
        actions={
          <Button onClick={() => setIsOrgModalOpen(true)}>
            <PlusIcon /> Add Organization
          </Button>
        }
        renderTableFilter={(table) => (
          <>
            <ColumnTextFilter
              table={table}
              columnId="account_number"
              placeholder="Account Number"
              clearLabel="Clear account number"
              className="w-50"
            />
            <ColumnTextFilter
              table={table}
              columnId="name"
              placeholder="Name"
              clearLabel="Clear name"
              className="w-50"
            />
          </>
        )}
      />

      <CreateOrgModal open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen} />
    </>
  )
}
