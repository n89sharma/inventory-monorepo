import { CreateModelModal } from '@/components/modals/create-model-modal'
import { Button } from '@/components/shadcn/button'
import { PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'

export function SettingsPage(): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className='flex flex-col gap-2 max-w-6xl'>
      <h1 className='text-2xl font-semibold p-2'>Settings</h1>
      <Button variant='secondary' onClick={() => setIsModalOpen(true)} className='w-fit'>
        <PlusIcon /> Create Model
      </Button>
      <CreateModelModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  )
}
