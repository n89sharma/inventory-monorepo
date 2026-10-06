import { useDepartureMutations } from '@/hooks/use-departure-mutations'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { showEntityCreatedToast } from '@/lib/success-toast'
import {
  DepartureMetadataFormSchema,
  type DepartureMetadataForm,
} from '@/ui-types/departure-form-types'
import { getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { AssetSummary } from 'shared-types'
import { CreateCollectionModal } from '../collections/create-collection-modal'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { DepartureMetadataFields } from './departure-metadata-fields'

const NO_SELECTED_ASSETS: AssetSummary[] = []

interface CreateDepartureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (departureNumber: string) => void
  assets?: AssetSummary[]
}

export function CreateDepartureModal({
  open,
  onOpenChange,
  onCreated,
  assets = NO_SELECTED_ASSETS,
}: CreateDepartureModalProps): React.JSX.Element {
  const defaultWarehouse = useProfileDefaultWarehouse()
  const mutations = useDepartureMutations()

  const values = useMemo(
    () =>
      ({
        origin: defaultWarehouse ? getSelectOption(defaultWarehouse) : UNSELECTED,
        customer: null,
        transporter: null,
        salesperson: UNSELECTED,
        comment: '',
        departure_date: null,
      }) satisfies DepartureMetadataForm,
    [defaultWarehouse],
  )
  const form = useForm<DepartureMetadataForm>({
    resolver: zodResolver(DepartureMetadataFormSchema),
    values,
    resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH,
  })

  async function create(metadata: DepartureMetadataForm) {
    const { departureNumber } = await mutations.create(metadata, assets)
    showEntityCreatedToast({ entity: 'departure', id: departureNumber })
    return departureNumber
  }

  return (
    <CreateCollectionModal
      open={open}
      onOpenChange={onOpenChange}
      title="New Departure"
      form={form}
      assetCount={assets.length}
      onCreate={create}
      onCreated={onCreated}
    >
      <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
        <DepartureMetadataFields control={form.control} />
        <Controller
          control={form.control}
          name="comment"
          render={({ field }) => (
            <Field className="col-span-2">
              <FieldLabel>Comments</FieldLabel>
              <Textarea placeholder="Departure notes…" className="resize-none" {...field} />
            </Field>
          )}
        />
      </FieldGroup>
    </CreateCollectionModal>
  )
}
