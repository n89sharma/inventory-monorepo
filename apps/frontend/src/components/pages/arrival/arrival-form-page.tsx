import { useConstantsStore } from '@/data/store/constants-store'
import { useOrgStore } from '@/data/store/org-store'
import { flattenFieldErrors } from '@/lib/utils'
import { ArrivalFormSchema, type ArrivalForm } from '@/ui-types/arrival-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ControlledPopoverSearch } from '../../custom/controlled-popover-search'
import { PageBreadcrumb } from '../../custom/page-breadcrumb'
import { SelectOptions } from '../../custom/select-options'
import { AssetModal } from '../../modals/create-asset-modal'
import { Button } from '../../shadcn/button'
import { DataTable } from '../../shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../../shadcn/field'
import { Textarea } from '../../shadcn/textarea'
import { getNewAssetTableColumns } from '../column-defs/new-assets-columns'
import { UNSELECTED } from '@/ui-types/select-option-types'

interface ArrivalFormPageProps {
  defaultValues?: ArrivalForm
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: ArrivalForm) => Promise<void>
}

export function ArrivalFormPage({ defaultValues, pageConfig, breadcrumbs, onValidSubmit }: ArrivalFormPageProps): React.JSX.Element {
  const navigate = useNavigate()
  const form = useForm<ArrivalForm>({
    resolver: zodResolver(ArrivalFormSchema),
    defaultValues: defaultValues ?? getDefaultArrival()
  })
  const warehouses = useConstantsStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])
  const orgs = useOrgStore(state => state.organizations)
  const { fields: assets, append: addAsset, remove: deleteAsset, update: updateAsset } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting } = form.formState
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)
  const [editingAssetIndex, setEditingAssetIndex] = useState<number | null>(null)
  const assetTableColumns = useMemo(() => getNewAssetTableColumns({
    onDelete: id => deleteAsset(id),
    onEdit: index => { setEditingAssetIndex(index); setIsAssetModalOpen(true) }
  }), [deleteAsset])
  const editingAsset = editingAssetIndex !== null ? form.getValues('assets')[editingAssetIndex] : null

  function getDefaultArrival() {
    return {
      vendor: null,
      transporter: null,
      warehouse: UNSELECTED,
      assets: [],
      comment: ''
    }
  }

  function getSubmitButtonContent() {
    if (isSubmitting) {
      return <><CircleNotchIcon className='animate-spin mr-1' size={16} />{pageConfig.submittingText}</>
    }
    return pageConfig.saveButtonText
  }

  function submitArrival() {
    form.handleSubmit(onValidSubmit, onInvalidArrival)()
  }

  function onInvalidArrival(errors: FieldErrors<ArrivalForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, ['id'])}`, { position: 'top-center' })
  }

  return (
    <div className='flex flex-col gap-2 max-w-6xl'>
      <PageBreadcrumb segments={breadcrumbs} />
      <h1 className='text-2xl font-semibold p-2'>{pageConfig.pageHeading}</h1>
      <form onSubmit={e => e.preventDefault()} className='border rounded-md p-2 flex flex-col gap-2'>
        <fieldset disabled={isSubmitting} className='contents'>
          <FieldSet>
            <FieldLegend>General Arrival Information</FieldLegend>
            <FieldGroup className='grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl'>

              <ControlledPopoverSearch
                control={form.control}
                name='vendor'
                options={orgs}
                searchKey='name'
                getLabel={o => o.name}
                fieldLabel='Vendor'
                fieldRequired={true}
                className='max-w-60'
              />

              <ControlledPopoverSearch
                control={form.control}
                name='transporter'
                options={orgs}
                searchKey='name'
                getLabel={o => o.name}
                fieldLabel='Transporter'
                fieldRequired={true}
                className='max-w-60'
              />

              <Controller
                control={form.control}
                name='warehouse'
                render={({ field: { onChange, value: warehouse }, fieldState }) => (
                  <SelectOptions
                    selection={warehouse}
                    onSelectionChange={onChange}
                    options={activeWarehouses}
                    getLabel={w => w.city_code}
                    fieldLabel='Warehouse'
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
              name='comment'
              render={({ field }) => (
                <Field className='max-w-xl'>
                  <FieldLabel>
                    Comments
                  </FieldLabel>
                  <Textarea
                    placeholder='Arrival notes'
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
                <div aria-live="polite">
                  {
                    fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )
                  }
                </div>
              )}
            />
          </FieldSet>

          <Button
            variant='secondary'
            type='button'
            onClick={() => { setEditingAssetIndex(null); setIsAssetModalOpen(true) }}
            className='w-fit'
          >
            <PlusIcon /> Add Asset
          </Button>

          <div className='flex gap-4'>
            <Button
              className='rounded-md'
              onClick={submitArrival}
              type='submit'
            >
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
      <AssetModal
        open={isAssetModalOpen}
        onOpenChange={setIsAssetModalOpen}
        addNewAsset={addAsset}
        updateAsset={updateAsset}
        editingAsset={editingAsset}
        editingIndex={editingAssetIndex}
      />

      <DataTable columns={assetTableColumns} data={assets} />

    </div>
  )
}
