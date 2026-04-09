import { AddAssetByBarcode } from '@/components/custom/add-assets-to-create-form'
import { ControlledPopoverSearch } from '@/components/custom/controlled-popover-search'
import { PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { SelectOptions } from '@/components/custom/select-options'
import { Button } from '@/components/shadcn/button'
import { DataTable } from '@/components/shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/shadcn/field'
import { Textarea } from '@/components/shadcn/textarea'
import { useOrgStore } from '@/data/store/org-store'
import { useUserStore } from '@/data/store/user-store'
import { flattenFieldErrors } from '@/lib/utils'
import { HoldFormSchema, type HoldForm } from '@/ui-types/hold-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { AssetSummary } from 'shared-types'
import { getDepartureFormAssetColumns } from '../column-defs/departure-form-asset-columns'

interface HoldFormPageProps {
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

export function HoldFormPage({ pageConfig, breadcrumbs, onValidSubmit }: HoldFormPageProps): React.JSX.Element {
  const navigate = useNavigate()
  const form = useForm<HoldForm>({
    resolver: zodResolver(HoldFormSchema),
    defaultValues: {
      created_for: UNSELECTED,
      customer: null,
      notes: '',
      assets: []
    }
  })
  const users = useUserStore(state => state.users)
  const orgs = useOrgStore(state => state.organizations)
  const { fields: assets, append: addAsset, remove: deleteAsset } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting } = form.formState

  const assetTableColumns = useMemo(() => getDepartureFormAssetColumns(deleteAsset), [deleteAsset])

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
      <PageBreadcrumb segments={breadcrumbs} />
      <h1 className='text-2xl font-semibold p-2'>{pageConfig.pageHeading}</h1>
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
                    getKey={u => u.username}
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
                    placeholder='Hold notes'
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

          <div className='flex gap-4'>
            <Button className='rounded-md' onClick={submitHold} type='submit'>
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
