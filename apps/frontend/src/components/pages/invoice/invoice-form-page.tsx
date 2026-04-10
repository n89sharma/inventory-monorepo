import { AddAssetByBarcode } from '@/components/custom/add-assets-to-create-form'
import { ControlledPopoverSearch } from '@/components/custom/controlled-popover-search'
import { PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { SelectOptions } from '@/components/custom/select-options'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { DataTable } from '@/components/shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { useConstantsStore } from '@/data/store/constants-store'
import { useOrgStore } from '@/data/store/org-store'
import { flattenFieldErrors } from '@/lib/utils'
import { InvoiceFormSchema, type InvoiceForm } from '@/ui-types/invoice-form-types'
import type { AssetSummary } from 'shared-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getDepartureFormAssetColumns } from '../column-defs/departure-form-asset-columns'

interface InvoiceFormPageProps {
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: InvoiceForm) => Promise<void>
}

function validateInvoiceAsset(asset: AssetSummary): string | null {
  if (asset.purchase_invoice_id != null) return `${asset.barcode} is already linked to another invoice`
  return null
}

export function InvoiceFormPage({ pageConfig, breadcrumbs, onValidSubmit }: InvoiceFormPageProps): React.JSX.Element {
  const navigate = useNavigate()
  const form = useForm<InvoiceForm>({
    resolver: zodResolver(InvoiceFormSchema),
    defaultValues: {
      invoice_number: '',
      organization: null,
      invoice_type: UNSELECTED,
      is_cleared: false,
      assets: []
    }
  })
  const orgs = useOrgStore(state => state.organizations)
  const invoiceTypes = useConstantsStore(state => state.invoiceTypes)
  const { fields: assets, append: addAsset, remove: deleteAsset } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting } = form.formState
  const assetTableColumns = useMemo(() => getDepartureFormAssetColumns(deleteAsset), [deleteAsset])

  function getSubmitButtonContent() {
    if (isSubmitting) {
      return <><CircleNotchIcon className='animate-spin mr-1' size={16} />{pageConfig.submittingText}</>
    }
    return pageConfig.saveButtonText
  }

  function submitInvoice() {
    form.handleSubmit(onValidSubmit, onInvalidInvoice)()
  }

  function onInvalidInvoice(errors: FieldErrors<InvoiceForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  return (
    <div className='flex flex-col gap-2 max-w-6xl'>
      <PageBreadcrumb segments={breadcrumbs} />
      <h1 className='text-2xl font-semibold p-2'>{pageConfig.pageHeading}</h1>
      <form onSubmit={e => e.preventDefault()} className='border rounded-md p-2 flex flex-col gap-2'>
        <fieldset disabled={isSubmitting} className='contents'>
          <FieldSet>
            <FieldLegend>Invoice Information</FieldLegend>
            <FieldGroup className='grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl'>

              <Controller
                control={form.control}
                name='invoice_number'
                render={({ field, fieldState }) => (
                  <Field className='max-w-60'>
                    <FieldLabel>Invoice Number *</FieldLabel>
                    <Input placeholder='e.g. INV-001' aria-invalid={fieldState.invalid} {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <ControlledPopoverSearch
                control={form.control}
                name='organization'
                options={orgs}
                searchKey='name'
                getLabel={o => o.name}
                fieldLabel='Organization'
                fieldRequired={true}
                className='max-w-60'
              />

              <Controller
                control={form.control}
                name='invoice_type'
                render={({ field: { onChange, value }, fieldState }) => (
                  <SelectOptions
                    selection={value}
                    onSelectionChange={onChange}
                    options={invoiceTypes}
                    getLabel={t => t.type}
                    getKey={t => String(t.id)}
                    fieldLabel='Invoice Type'
                    anyAllowed={false}
                    fieldRequired={true}
                    error={fieldState.invalid}
                    className='max-w-60'
                  />
                )}
              />

            </FieldGroup>

            <Controller
              control={form.control}
              name='is_cleared'
              render={({ field }) => (
                <Field orientation='horizontal' className='w-fit items-center gap-2'>
                  <Checkbox
                    id='is_cleared'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor='is_cleared'>Cleared</FieldLabel>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name='assets'
              render={({ fieldState }) => (
                <div aria-live='polite'>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </div>
              )}
            />
          </FieldSet>

          <AddAssetByBarcode
            getAssets={() => form.getValues('assets')}
            onAddAsset={addAsset}
            entityName='invoice'
            validateAsset={validateInvoiceAsset}
          />

          <div className='flex gap-4'>
            <Button className='rounded-md' onClick={submitInvoice} type='submit'>
              {getSubmitButtonContent()}
            </Button>
            <Button
              variant='outline'
              type='button'
              disabled={isSubmitting}
              onClick={() => navigate(pageConfig.cancelNavUrl)}
            >
              Cancel
            </Button>
          </div>
        </fieldset>
      </form>

      <DataTable columns={assetTableColumns} data={assets} />
    </div>
  )
}
