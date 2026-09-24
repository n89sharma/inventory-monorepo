import { createReleaseTableColumns } from '@/components/settings/release-table-columns'
import { SettingsListPage } from '@/components/settings/settings-list-page'
import { Button } from '@/components/shadcn/button'
import { useAdminReleases } from '@/hooks/use-release'
import { useReleaseMutations } from '@/hooks/use-release-mutations'
import { PlusIcon } from '@phosphor-icons/react'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AdminRelease } from 'shared-types'
import { toast } from 'sonner'

const TABLE_LABEL = 'Releases'
const RELEASES_PATH = '/settings/releases'
const RELEASE_DEFAULT_SORT = { id: 'published_at', desc: true }

export function ReleasesSettingsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const releases = useAdminReleases()
  const { createRelease } = useReleaseMutations()

  const handleEdit = useCallback(
    (release: AdminRelease) => navigate(`${RELEASES_PATH}/${release.id}`),
    [navigate],
  )
  const columns = useMemo(() => createReleaseTableColumns(handleEdit), [handleEdit])

  async function addRelease() {
    try {
      const id = await createRelease()
      navigate(`${RELEASES_PATH}/${id}`)
    } catch {
      toast.error('Could not create the release', { position: 'top-center' })
    }
  }

  return (
    <SettingsListPage
      title="Release Notes"
      label={TABLE_LABEL}
      columns={columns}
      data={releases}
      defaultSort={RELEASE_DEFAULT_SORT}
      actions={
        <Button onClick={addRelease}>
          <PlusIcon /> Add Release
        </Button>
      }
    />
  )
}
