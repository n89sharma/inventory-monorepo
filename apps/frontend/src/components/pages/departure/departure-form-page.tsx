import { getAssetByBarcode } from '@/data/api/transfer-api'
import { useConstantsStore } from '@/data/store/constants-store'
import { useOrgStore } from '@/data/store/org-store'
import { flattenFieldErrors } from '@/lib/utils'
import { DepartureFormSchema, type DepartureForm } from '@/ui-types/departure-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react'
import { useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ControlledPopoverSearch } from '../../custom/controlled-popover-search'
import { PageBreadcrumb } from '../../custom/page-breadcrumb'
import { SelectOptions } from '../../custom/select-options'
import { Button } from '../../shadcn/button'
import { DataTable } from '../../shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../../shadcn/field'
import { Input } from '../../shadcn/input'
import { Textarea } from '../../shadcn/textarea'
import { getDepartureFormAssetColumns } from '../column-defs/departure-form-asset-columns'

interface DepartureFormPageProps {
  defaultValues?: DepartureForm
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: DepartureForm) => Promise<void>
}

export function DepartureFormPage({ defaultValues, pageConfig, breadcrumbs, onValidSubmit }: DepartureFormPageProps): React.JSX.Element {
  const navigate = useNavigate()
  const form = useForm<DepartureForm>({
    resolver: zodResolver(DepartureFormSchema),
    defaultValues: defaultValues ?? getDefaultDeparture()
  })
  const warehouses = useConstantsStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])
  const orgs = useOrgStore(state => state.organizations)
  const { fields: assets, append: addAsset, remove: deleteAsset } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting } = form.formState

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const assetTableColumns = useMemo(() => getDepartureFormAssetColumns(deleteAsset), [deleteAsset])

  function getDefaultDeparture(): DepartureForm {
    return {
      origin: UNSELECTED,
      customer: null,
      transporter: null,
      comment: '',
      assets: []
    }
  }

  function getSubmitButtonContent() {
    if (isSubmitting) {
      return <><CircleNotchIcon className='animate-spin mr-1' size={16} />{pageConfig.submittingText}</>
    }
    return pageConfig.saveButtonText
  }

  function submitDeparture() {
    form.handleSubmit(onValidSubmit, onInvalidDeparture)()
  }

  function onInvalidDeparture(errors: FieldErrors<DepartureForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, ['id'])}`, { position: 'top-center' })
  }

  async function handleAddAsset() {
    const barcode = barcodeInputRef.current?.value.trim()
    if (!barcode) return

    const currentAssets = form.getValues('assets')
    if (currentAssets.some(a => a.barcode === barcode)) {
      setBarcodeError(`Asset ${barcode} is already in this departure.`)
      return
    }

    setBarcodeError(null)
    setIsLookingUp(true)
    try {
      const asset = await getAssetByBarcode(barcode)
      addAsset(asset)
      if (barcodeInputRef.current) barcodeInputRef.current.value = ''
    } catch {
      setBarcodeError('Asset not found.')
    } finally {
      setIsLookingUp(false)
    }
  }

  function onBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddAsset()
    }
  }

  return (
    <div className='flex flex-col gap-2 max-w-6xl'>
      <PageBreadcrumb segments={breadcrumbs} />
      <h1 className='text-3xl font-bold p-2'>{pageConfig.pageHeading}</h1>
      <form onSubmit={e => e.preventDefault()} className='border rounded-md p-2 flex flex-col gap-2'>
        <fieldset disabled={isSubmitting} className='contents'>
          <FieldSet>
            <FieldLegend>General Departure Information</FieldLegend>
            <FieldGroup className='grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl'>

              <Controller
                control={form.control}
                name='origin'
                render={({ field: { onChange, value }, fieldState }) => (
                  <SelectOptions
                    selection={value}
                    onSelectionChange={onChange}
                    options={activeWarehouses}
                    getLabel={w => w.city_code}
                    fieldLabel='Origin'
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

            </FieldGroup>

            <Controller
              control={form.control}
              name='comment'
              render={({ field }) => (
                <Field className='max-w-xl'>
                  <FieldLabel>Comments</FieldLabel>
                  <Textarea
                    placeholder='Departure notes'
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </div>
              )}
            />
          </FieldSet>

          <div className='flex items-end gap-2 max-w-xl'>
            <Field className='flex-1'>
              <FieldLabel>Barcode</FieldLabel>
              <Input
                ref={barcodeInputRef}
                placeholder='Scan or enter barcode'
                onKeyDown={onBarcodeKeyDown}
                onChange={() => setBarcodeError(null)}
              />
              {barcodeError && (
                <p className='text-sm text-destructive mt-1'>{barcodeError}</p>
              )}
            </Field>
            <Button
              variant='secondary'
              type='button'
              onClick={handleAddAsset}
              disabled={isLookingUp}
              className='mb-0.5'
            >
              {isLookingUp
                ? <><CircleNotchIcon className='animate-spin mr-1' size={16} />Looking up...</>
                : <><PlusIcon />Add Asset</>
              }
            </Button>
          </div>

          <div className='flex gap-4'>
            <Button className='rounded-md' onClick={submitDeparture} type='submit'>
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
