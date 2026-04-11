import { CreateBrandModal } from '@/components/modals/create-brand-modal'
import { CreateModelModal } from '@/components/modals/create-model-modal'
import { CreateOrgModal } from '@/components/modals/create-org-modal'
import { Button } from '@/components/shadcn/button'
import { PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'

export function SettingsPage(): React.JSX.Element {
  const [isModelModalOpen, setIsModelModalOpen] = useState(false)
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false)

  return (
    <div className='flex flex-col gap-2 max-w-6xl'>
      <h1 className='text-2xl font-semibold p-2'>Settings</h1>
      <Button variant='secondary' onClick={() => setIsBrandModalOpen(true)} className='w-fit'>
        <PlusIcon /> Create Brand
      </Button>
      <Button variant='secondary' onClick={() => setIsModelModalOpen(true)} className='w-fit'>
        <PlusIcon /> Create Model
      </Button>
      <Button variant='secondary' onClick={() => setIsOrgModalOpen(true)} className='w-fit'>
        <PlusIcon /> Create Organization
      </Button>
      <CreateBrandModal open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen} />
      <CreateModelModal open={isModelModalOpen} onOpenChange={setIsModelModalOpen} />
      <CreateOrgModal open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen} />
    </div>
  )
}
