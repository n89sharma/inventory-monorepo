import { zodResolver } from '@hookform/resolvers/zod'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import z from 'zod'
import { CreateCollectionModal } from './create-collection-modal'

const CREATED_NUMBER = 'H-0000001'

const NameFormSchema = z.object({ name: z.string().min(1, 'Name is required') })
type NameForm = z.infer<typeof NameFormSchema>

function TestModal({
  defaultName,
  assetCount,
  onOpenChange,
  onCreate,
  onCreated,
}: {
  defaultName: string
  assetCount: number
  onOpenChange: (open: boolean) => void
  onCreate: (values: NameForm) => Promise<string>
  onCreated: (collectionNumber: string) => void
}) {
  const form = useForm<NameForm>({
    resolver: zodResolver(NameFormSchema),
    defaultValues: { name: defaultName },
  })
  return (
    <CreateCollectionModal
      open
      onOpenChange={onOpenChange}
      title="New Thing"
      form={form}
      assetCount={assetCount}
      onCreate={onCreate}
      onCreated={onCreated}
    >
      <input aria-label="Name" {...form.register('name')} />
    </CreateCollectionModal>
  )
}

function renderModal({
  defaultName = 'Spring order',
  assetCount = 0,
  onCreate = vi.fn().mockResolvedValue(CREATED_NUMBER),
} = {}) {
  const onOpenChange = vi.fn()
  const onCreated = vi.fn()
  render(
    <TestModal
      defaultName={defaultName}
      assetCount={assetCount}
      onOpenChange={onOpenChange}
      onCreate={onCreate}
      onCreated={onCreated}
    />,
  )
  return { onCreate, onOpenChange, onCreated }
}

describe('CreateCollectionModal', () => {
  it('creates, closes, then reports the new number', async () => {
    const { onCreate, onOpenChange, onCreated } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED_NUMBER))
    expect(onCreate.mock.calls[0][0]).toEqual({ name: 'Spring order' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps the dialog open with the typed values when the create fails', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('409'))
    const { onOpenChange, onCreated } = renderModal({ onCreate })

    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Summer order' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce())
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Summer order')
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('does not create while a required field is empty', async () => {
    const { onCreate } = renderModal({ defaultName: '' })

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled())
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('states how many selected assets the create will add', () => {
    renderModal({ assetCount: 3 })

    expect(screen.getByText('3 selected assets will be added')).toBeVisible()
  })

  it('says nothing about assets when none are attached', () => {
    renderModal()

    expect(screen.queryByText(/selected asset/)).not.toBeInTheDocument()
  })
})
