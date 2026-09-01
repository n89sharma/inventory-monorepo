import { CreateOrgModal } from '@/components/settings/create-org-modal'
import { EditOrgModal } from '@/components/settings/edit-org-modal'
import { createOrgTableColumns } from '@/components/settings/org-table-columns'
import { SettingsListPage } from '@/components/settings/settings-list-page'
import { Button } from '@/components/shadcn/button'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { useCan } from '@/hooks/use-can'
import { useOrgs } from '@/hooks/use-org'
import { PlusIcon } from '@phosphor-icons/react'
import { useCallback, useMemo, useState } from 'react'
import type { OrgDetail } from 'shared-types'

const TABLE_LABEL = 'Organizations'

const ORG_DEFAULT_SORT = { id: 'account_number', desc: false }

export function OrganizationsSettingsPage(): React.JSX.Element {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)

  const [editTarget, setEditTarget] = useState<OrgDetail | null>(null)

  const orgs = useOrgs()
  const canEdit = useCan('update_settings')
  const handleEdit = useCallback((org: OrgDetail) => setEditTarget(org), [])
  const columns = useMemo(
    () => createOrgTableColumns(canEdit ? handleEdit : undefined),
    [canEdit, handleEdit],
  )

  return (
    <>
      <SettingsListPage
        title="Organizations"
        label={TABLE_LABEL}
        columns={columns}
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
      {editTarget && (
        <EditOrgModal
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
          org={editTarget}
        />
      )}
    </>
  )
}
