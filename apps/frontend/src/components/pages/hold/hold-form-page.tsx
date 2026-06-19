import { AddAssetByBarcode } from '@/components/custom/add-assets-to-create-form'
import { ControlledSearchSelectInput } from '@/components/custom/controlled-search-select-input'
import { ControlledSelectOptionSearchSelect } from '@/components/custom/controlled-select-option-search-select'
import { StickyEditPageHeader } from '@/components/custom/sticky-edit-page-header'
import { UnsavedChangesDialog } from '@/components/custom/unsaved-changes-dialog'
import { PageContent } from '@/components/layout/page-content'
import { DataTable } from '@/components/shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/shadcn/field'
import { Textarea } from '@/components/shadcn/textarea'
import { useOrgStore } from '@/data/store/org-store'
import { useActiveUsers } from '@/hooks/use-active-users'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { HoldFormSchema, type HoldForm } from '@/ui-types/hold-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import type { AssetSummary } from 'shared-types'
import { toast } from 'sonner'
import { getFormAssetColumns } from '../column-defs/form-asset-columns'

interface HoldFormPageProps {
  defaultValues?: HoldForm
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: HoldForm) => Promise<void>
}

function validateHoldAsset(asset: AssetSummary): string | null {
  if (!!asset.hold_number) return `${asset.barcode} already has an active hold`
  return null
}

export function HoldFormPage({ defaultValues, pageConfig, breadcrumbs, onValidSubmit }: HoldFormPageProps): React.JSX.Element {
  const form = useForm<HoldForm>({
    resolver: zodResolver(HoldFormSchema),
    defaultValues: defaultValues ?? {
      created_for: UNSELECTED,
      customer: null,
      notes: '',
      assets: []
    }
  })
  const activeUsers = useActiveUsers()
  const orgs = useOrgStore(state => state.organizations)
  const { fields: assets, append: addAsset, remove: deleteAsset } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting, isDirty } = form.formState
  const guard = useNavigationGuard({ isDirty: isDirty && !isSubmitting })

  const assetTableColumns = useMemo(() => getFormAssetColumns(deleteAsset), [deleteAsset])

  function submitHold() {
    form.handleSubmit(onValidSubmit, onInvalidHold)()
  }

  function onInvalidHold(errors: FieldErrors<HoldForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  return (
    <>
      <StickyEditPageHeader
        breadcrumbs={breadcrumbs}
        pageHeading={pageConfig.pageHeading}
        onNavigate={guard.guardedNavigate}
        cancelNavUrl={pageConfig.cancelNavUrl}
        isSubmitting={isSubmitting}
        isDirty={isDirty}
        submittingText={pageConfig.submittingText}
        saveButtonText={pageConfig.saveButtonText}
        onSave={submitHold}
      />
      <PageContent className='flex flex-col gap-2'>
        <form onSubmit={e => e.preventDefault()} className='border rounded-md p-2 flex flex-col gap-2'>
          <fieldset disabled={isSubmitting} className='contents'>
            <FieldSet>
              <FieldLegend>General Hold Information</FieldLegend>
              <FieldGroup className='grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl'>

                <ControlledSelectOptionSearchSelect
                  control={form.control}
                  name='created_for'
                  options={activeUsers}
                  getLabel={u => u.name}
                  fieldLabel='Created For'
                  fieldRequired={true}
                  className='max-w-60'
                />

                <ControlledSearchSelectInput
                  control={form.control}
                  name='customer'
                  options={orgs}
                  getLabel={o => o.name}
                  fieldLabel='Customer'
                  fieldRequired={true}
                  className='max-w-60'
                />

              </FieldGroup>

              <Controller
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <Field className='max-w-xl'>
                    <FieldLabel>Notes</FieldLabel>
                    <Textarea
                      placeholder='Hold notes…'
                      className='resize-none'
                      {...field}
                    />
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
          </fieldset>
        </form>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold'>Assets</h2>
          </div>
          <AddAssetByBarcode
            getAssets={() => form.getValues('assets')}
            onAddAsset={addAsset}
            entityName='hold'
            validateAsset={validateHoldAsset}
            disabled={isSubmitting}
            className='max-w-xl'
          />
          <DataTable columns={assetTableColumns} data={assets} />
        </div>

        <UnsavedChangesDialog
          open={guard.isBlocked}
          onOpenChange={guard.onOpenChange}
          onDiscard={guard.onDiscard}
        />
      </PageContent>
    </>
  )
}
