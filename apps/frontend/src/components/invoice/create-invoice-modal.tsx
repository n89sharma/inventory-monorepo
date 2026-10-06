import { useInvoiceMutations } from '@/hooks/use-invoice-mutations'
import { useInvoiceTypes } from '@/hooks/use-reference-data'
import { KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { formatTitleCase } from '@/lib/formatters'
import { showEntityCreatedToast } from '@/lib/success-toast'
import {
  InvoiceMetadataFormSchema,
  type InvoiceMetadataForm,
  type InvoicePrefill,
} from '@/ui-types/invoice-form-types'
import { getSelectedOrNull, getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { startOfDay } from 'date-fns'
import { useMemo } from 'react'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'
import { INVOICE_TYPE, type AssetSummary, type InvoiceType } from 'shared-types'
import { CreateCollectionModal } from '../collections/create-collection-modal'
import { Field, FieldError, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { ToggleGroup, ToggleGroupItem } from '../shadcn/toggle-group'
import { InvoiceMetadataFields } from './invoice-metadata-fields'

const NO_SELECTED_ASSETS: AssetSummary[] = []

interface CreateInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (invoiceNumber: string) => void
  assets?: AssetSummary[]
  prefill?: InvoicePrefill
}

export function CreateInvoiceModal({
  open,
  onOpenChange,
  onCreated,
  assets = NO_SELECTED_ASSETS,
  prefill,
}: CreateInvoiceModalProps): React.JSX.Element {
  const invoiceTypes = useInvoiceTypes()
  const mutations = useInvoiceMutations()

  const values = useMemo(() => {
    const defaultInvoiceType = invoiceTypes.find(
      (t) => t.type === (prefill?.invoiceType ?? INVOICE_TYPE.purchase),
    )
    return {
      invoice_reference: '',
      invoice_date: startOfDay(new Date()),
      organization: prefill?.organization ?? null,
      invoice_type: defaultInvoiceType ? getSelectOption(defaultInvoiceType) : UNSELECTED,
      is_cleared: false,
      comment: '',
    } satisfies InvoiceMetadataForm
  }, [invoiceTypes, prefill])
  const form = useForm<InvoiceMetadataForm>({
    resolver: zodResolver(InvoiceMetadataFormSchema),
    values,
    resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH,
  })

  const invoiceType = useWatch({ control: form.control, name: 'invoice_type' })
  const organizationLabel =
    getSelectedOrNull(invoiceType)?.type === INVOICE_TYPE.sales ? 'Customer' : 'Vendor'

  async function create(metadata: InvoiceMetadataForm) {
    const { invoiceNumber } = await mutations.create(metadata, assets)
    showEntityCreatedToast({
      entity: 'invoice',
      id: invoiceNumber,
      label: metadata.invoice_reference,
    })
    return invoiceNumber
  }

  return (
    <CreateCollectionModal
      open={open}
      onOpenChange={onOpenChange}
      title="New Invoice"
      form={form}
      assetCount={assets.length}
      onCreate={create}
      onCreated={onCreated}
    >
      <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
        <InvoiceTypeToggleField control={form.control} invoiceTypes={invoiceTypes} />
        <InvoiceMetadataFields control={form.control} organizationLabel={organizationLabel} />
        <Controller
          control={form.control}
          name="comment"
          render={({ field }) => (
            <Field className="col-span-2">
              <FieldLabel>Comments</FieldLabel>
              <Textarea placeholder="Invoice notes…" className="resize-none" {...field} />
            </Field>
          )}
        />
      </FieldGroup>
    </CreateCollectionModal>
  )
}

function InvoiceTypeToggleField({
  control,
  invoiceTypes,
}: {
  control: Control<InvoiceMetadataForm>
  invoiceTypes: InvoiceType[]
}): React.JSX.Element {
  return (
    <Controller
      control={control}
      name="invoice_type"
      render={({ field: { onChange, value }, fieldState }) => (
        <Field className="col-span-2">
          <FieldLabel>
            Invoice Type
            <span className="text-destructive">*</span>
          </FieldLabel>
          <ToggleGroup
            type="single"
            value={String(getSelectedOrNull(value)?.id ?? '')}
            onValueChange={(next) => {
              const picked = invoiceTypes.find((t) => String(t.id) === next)
              if (picked) onChange(getSelectOption(picked))
            }}
            variant="outline"
            size="sm"
            className="w-fit"
            aria-invalid={fieldState.invalid}
          >
            {invoiceTypes.map((t) => (
              <ToggleGroupItem key={t.id} value={String(t.id)}>
                {formatTitleCase(t.type)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
