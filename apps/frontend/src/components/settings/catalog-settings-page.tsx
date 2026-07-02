import { PageContent } from '@/components/app-layout/page-content'
import { CreateBrandModal } from '@/components/settings/create-brand-modal'
import { CreateModelModal } from '@/components/settings/create-model-modal'
import { Button } from '@/components/shadcn/button'
import { PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'

export function CatalogSettingsPage(): React.JSX.Element {
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false)
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)

  return (
    <PageContent className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold p-2">Catalog</h1>
      <Button variant="secondary" onClick={() => setIsBrandModalOpen(true)} className="w-fit">
        <PlusIcon /> Add Brand
      </Button>
      <Button variant="secondary" onClick={() => setIsModelModalOpen(true)} className="w-fit">
        <PlusIcon /> Add Model
      </Button>
      <CreateBrandModal open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen} />
      <CreateModelModal open={isModelModalOpen} onOpenChange={setIsModelModalOpen} />
    </PageContent>
  )
}
