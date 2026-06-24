import { PageContent } from '@/components/layout/page-content'
import { CreateOrgModal } from '@/components/modals/create-org-modal'
import { Button } from '@/components/shadcn/button'
import { PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'

export function OrganizationsSettingsPage(): React.JSX.Element {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)

  return (
    <PageContent className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold p-2">Organizations</h1>
      <Button variant="secondary" onClick={() => setIsOrgModalOpen(true)} className="w-fit">
        <PlusIcon /> Add Organization
      </Button>
      <CreateOrgModal open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen} />
    </PageContent>
  )
}
