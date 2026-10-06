import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { useTransferMutations } from '@/hooks/use-transfer-mutations'
import { KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { showEntityCreatedToast } from '@/lib/success-toast'
import { getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import {
  TransferMetadataFormSchema,
  type TransferMetadataForm,
} from '@/ui-types/transfer-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { AssetSummary } from 'shared-types'
import { CreateCollectionModal } from '../collections/create-collection-modal'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { TransferMetadataFields } from './transfer-metadata-fields'

const NO_SELECTED_ASSETS: AssetSummary[] = []

interface CreateTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (transferNumber: string) => void
  assets?: AssetSummary[]
}

export function CreateTransferModal({
  open,
  onOpenChange,
  onCreated,
  assets = NO_SELECTED_ASSETS,
}: CreateTransferModalProps): React.JSX.Element {
  const defaultWarehouse = useProfileDefaultWarehouse()
  const mutations = useTransferMutations()

  const values = useMemo(
    () =>
      ({
        origin: defaultWarehouse ? getSelectOption(defaultWarehouse) : UNSELECTED,
        destination: UNSELECTED,
        transporter: null,
        comment: '',
        transfer_date: null,
      }) satisfies TransferMetadataForm,
    [defaultWarehouse],
  )
  const form = useForm<TransferMetadataForm>({
    resolver: zodResolver(TransferMetadataFormSchema),
    values,
    resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH,
  })

  async function create(metadata: TransferMetadataForm) {
    const { transferNumber } = await mutations.create(metadata, assets)
    showEntityCreatedToast({ entity: 'transfer', id: transferNumber })
    return transferNumber
  }

  return (
    <CreateCollectionModal
      open={open}
      onOpenChange={onOpenChange}
      title="New Transfer"
      form={form}
      assetCount={assets.length}
      onCreate={create}
      onCreated={onCreated}
    >
      <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
        <TransferMetadataFields control={form.control} />
        <Controller
          control={form.control}
          name="comment"
          render={({ field }) => (
            <Field className="col-span-2">
              <FieldLabel>Comments</FieldLabel>
              <Textarea placeholder="Transfer notes…" className="resize-none" {...field} />
            </Field>
          )}
        />
      </FieldGroup>
    </CreateCollectionModal>
  )
}
