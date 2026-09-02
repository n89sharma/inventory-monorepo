import { CreateOrgModal } from '@/components/settings/create-org-modal'
import { MergeOrgModal } from '@/components/settings/merge-org-modal'
import { EditOrgModal } from '@/components/settings/edit-org-modal'
import { createOrgTableColumns } from '@/components/settings/org-table-columns'
import { SettingsListPage } from '@/components/settings/settings-list-page'
import { Button } from '@/components/shadcn/button'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { useCan } from '@/hooks/use-can'
import { useOrgs } from '@/hooks/use-org'
import { ArrowsMergeIcon, PlusIcon } from '@phosphor-icons/react'
import { createSelectColumn } from '@/components/table-columns/column-primitives'
import { useCallback, useMemo, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import type { OrgDetail } from 'shared-types'

const TABLE_LABEL = 'Organizations'

const ORG_DEFAULT_SORT = { id: 'account_number', desc: false }
const ORG_PIN_LEFT = ['select']
const getOrgRowId = (org: OrgDetail) => String(org.id)

export function OrganizationsSettingsPage(): React.JSX.Element {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)

  const [editTarget, setEditTarget] = useState<OrgDetail | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)

  const orgs = useOrgs()
  const canEdit = useCan('update_settings')
  const handleEdit = useCallback((org: OrgDetail) => setEditTarget(org), [])
  const columns = useMemo(
    () => [
      createSelectColumn<OrgDetail>(),
      ...createOrgTableColumns(canEdit ? handleEdit : undefined),
    ],
    [canEdit, handleEdit],
  )

  const selectedOrgs = useMemo(
    () => orgs.filter((org) => rowSelection[String(org.id)]),
    [orgs, rowSelection],
  )

  return (
    <>
      <SettingsListPage
        title="Organizations"
        label={TABLE_LABEL}
        columns={columns}
        data={orgs}
        defaultSort={ORG_DEFAULT_SORT}
        getRowId={getOrgRowId}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        pinLeft={ORG_PIN_LEFT}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsMergeModalOpen(true)}
              disabled={selectedOrgs.length < 2}
            >
              <ArrowsMergeIcon /> Merge
            </Button>
            <Button onClick={() => setIsOrgModalOpen(true)}>
              <PlusIcon /> Add Organization
            </Button>
          </div>
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
      {isMergeModalOpen && (
        <MergeOrgModal
          open={isMergeModalOpen}
          onOpenChange={setIsMergeModalOpen}
          orgs={selectedOrgs}
          onMerged={() => setRowSelection({})}
        />
      )}
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
