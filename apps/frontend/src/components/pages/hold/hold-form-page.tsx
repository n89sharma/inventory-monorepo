import { AddAssetByBarcode } from '@/components/custom/add-assets-to-create-form'
import { ControlledPopoverSearch } from '@/components/custom/controlled-popover-search'
import { PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { SelectOptions } from '@/components/custom/select-options'
import { UnsavedChangesDialog } from '@/components/custom/unsaved-changes-dialog'
import { Button } from '@/components/shadcn/button'
import { DataTable } from '@/components/shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/shadcn/field'
import { Textarea } from '@/components/shadcn/textarea'
import { useOrgStore } from '@/data/store/org-store'
import { useUserStore } from '@/data/store/user-store'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { HoldFormSchema, type HoldForm } from '@/ui-types/hold-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import type { AssetSummary } from 'shared-types'
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
  if (asset.is_held === true) return `${asset.barcode} already has an active hold`
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
  const users = useUserStore(state => state.users)
  const orgs = useOrgStore(state => state.organizations)
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

  function submitHold() {
    form.handleSubmit(onValidSubmit, onInvalidHold)()
  }

  function onInvalidHold(errors: FieldErrors<HoldForm>) {
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
              onClick={submitHold}
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
            <FieldLegend>General Hold Information</FieldLegend>
            <FieldGroup className='grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl'>

              <Controller
                control={form.control}
                name='created_for'
                render={({ field: { onChange, value }, fieldState }) => (
                  <SelectOptions
                    selection={value}
                    onSelectionChange={onChange}
                    options={users}
                    getLabel={u => u.name}
                    getKey={u => u.name}
                    fieldLabel='Created For'
                    anyAllowed={false}
                    fieldRequired={true}
                    error={fieldState.invalid}
                    className='max-w-60'
                  />
                )}
              />

              <ControlledPopoverSearch
                control={form.control}
                name='customer'
                options={orgs}
                searchKey='name'
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

          <AddAssetByBarcode
            getAssets={() => form.getValues('assets')}
            onAddAsset={addAsset}
            entityName='hold'
            validateAsset={validateHoldAsset}
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
