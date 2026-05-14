import { AddAssetByBarcode } from '@/components/custom/add-assets-to-create-form'
import { ControlledPopoverSearch } from '@/components/custom/controlled-popover-search'
import { PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { SelectOptions } from '@/components/custom/select-options'
import { UnsavedChangesDialog } from '@/components/custom/unsaved-changes-dialog'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { DataTable } from '@/components/shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { useOrgStore } from '@/data/store/org-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { InvoiceFormSchema, type InvoiceForm } from '@/ui-types/invoice-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import type { AssetSummary } from 'shared-types'
import { toast } from 'sonner'
import { getFormAssetColumns } from '../column-defs/form-asset-columns'

interface InvoiceFormPageProps {
  defaultValues?: InvoiceForm
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

export function InvoiceFormPage(
  { defaultValues, pageConfig, breadcrumbs, onValidSubmit }: InvoiceFormPageProps
): React.JSX.Element {
  const form = useForm<InvoiceForm>({
    resolver: zodResolver(InvoiceFormSchema),
    defaultValues: defaultValues ?? {
      invoice_number: '',
      organization: null,
      invoice_type: UNSELECTED,
      is_cleared: false,
      assets: []
    }
  })
  const orgs = useOrgStore(state => state.organizations)
  const invoiceTypes = useReferenceDataStore(state => state.invoiceTypes)
  const { fields: assets, append: addAsset, remove: deleteAsset } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting, isDirty } = form.formState
  const guard = useNavigationGuard({ isDirty: isDirty && !isSubmitting })
  const assetTableColumns = useMemo(() => getFormAssetColumns(deleteAsset), [deleteAsset])

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
      <div className='sticky top-[53px] z-10 bg-background -mt-4 pt-4 pb-3 flex flex-col gap-2 shadow-[0_6px_8px_-6px_rgb(0_0_0_/_0.10)]'>
        <PageBreadcrumb segments={breadcrumbs} onNavigate={guard.guardedNavigate} />
        <div className='flex items-center justify-between gap-4'>
          <h1 className='text-2xl font-semibold'>{pageConfig.pageHeading}</h1>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              type='button'
              disabled={isSubmitting}
              onClick={() => guard.guardedNavigate(pageConfig.cancelNavUrl)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={submitInvoice}
              disabled={!isDirty || isSubmitting}
            >
              {getSubmitButtonContent()}
            </Button>
          </div>
        </div>
      </div>
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
        </fieldset>
      </form>

      <DataTable columns={assetTableColumns} data={assets} />

      <UnsavedChangesDialog
        open={guard.isBlocked}
        onOpenChange={guard.onOpenChange}
        onDiscard={guard.onDiscard}
      />
    </div>
  )
}
