import { useHoldMutations } from '@/hooks/use-hold-mutations'
import { showEntityCreatedToast } from '@/lib/success-toast'
import { HoldMetadataFormSchema, type HoldMetadataForm } from '@/ui-types/hold-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type { AssetSummary } from 'shared-types'
import { CreateCollectionModal } from '../collections/create-collection-modal'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { HoldMetadataFields } from './hold-metadata-fields'

const DEFAULT_HOLD = {
  created_for: UNSELECTED,
  customer: null,
  notes: '',
} as const satisfies HoldMetadataForm

const NO_SELECTED_ASSETS: AssetSummary[] = []

interface CreateHoldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (holdNumber: string) => void
  assets?: AssetSummary[]
}

export function CreateHoldModal({
  open,
  onOpenChange,
  onCreated,
  assets = NO_SELECTED_ASSETS,
}: CreateHoldModalProps): React.JSX.Element {
  const mutations = useHoldMutations()
  const form = useForm<HoldMetadataForm>({
    resolver: zodResolver(HoldMetadataFormSchema),
    defaultValues: DEFAULT_HOLD,
  })

  async function create(metadata: HoldMetadataForm) {
    const { holdNumber } = await mutations.create(metadata, assets)
    showEntityCreatedToast({ entity: 'hold', id: holdNumber })
    return holdNumber
  }

  return (
    <CreateCollectionModal
      open={open}
      onOpenChange={onOpenChange}
      title="New Hold"
      form={form}
      assetCount={assets.length}
      onCreate={create}
      onCreated={onCreated}
    >
      <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
        <HoldMetadataFields control={form.control} />
        <Controller
          control={form.control}
          name="notes"
          render={({ field }) => (
            <Field className="col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <Textarea placeholder="Hold notes…" className="resize-none" {...field} />
            </Field>
          )}
        />
      </FieldGroup>
    </CreateCollectionModal>
  )
}
