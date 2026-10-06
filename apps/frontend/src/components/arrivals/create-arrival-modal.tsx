import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { showEntityCreatedToast } from '@/lib/success-toast'
import { ArrivalMetadataFormSchema, type ArrivalMetadataForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { CreateCollectionModal } from '../collections/create-collection-modal'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { ArrivalMetadataFields } from './arrival-metadata-fields'

const NO_ASSET_COUNT = 0

interface CreateArrivalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (arrivalNumber: string) => void
}

export function CreateArrivalModal({
  open,
  onOpenChange,
  onCreated,
}: CreateArrivalModalProps): React.JSX.Element {
  const defaultWarehouse = useProfileDefaultWarehouse()
  const mutations = useArrivalMutations()

  const values = useMemo(
    () =>
      ({
        vendor: null,
        transporter: null,
        warehouse: defaultWarehouse ? getSelectOption(defaultWarehouse) : UNSELECTED,
        comment: '',
      }) satisfies ArrivalMetadataForm,
    [defaultWarehouse],
  )
  const form = useForm<ArrivalMetadataForm>({
    resolver: zodResolver(ArrivalMetadataFormSchema),
    values,
    resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH,
  })

  async function create(metadata: ArrivalMetadataForm) {
    const { arrivalNumber } = await mutations.create(metadata)
    showEntityCreatedToast({ entity: 'arrival', id: arrivalNumber })
    return arrivalNumber
  }

  return (
    <CreateCollectionModal
      open={open}
      onOpenChange={onOpenChange}
      title="New Arrival"
      form={form}
      assetCount={NO_ASSET_COUNT}
      onCreate={create}
      onCreated={onCreated}
    >
      <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
        <ArrivalMetadataFields control={form.control} />
        <Controller
          control={form.control}
          name="comment"
          render={({ field }) => (
            <Field className="col-span-2">
              <FieldLabel>Comments</FieldLabel>
              <Textarea placeholder="Arrival notes…" className="resize-none" {...field} />
            </Field>
          )}
        />
      </FieldGroup>
    </CreateCollectionModal>
  )
}
