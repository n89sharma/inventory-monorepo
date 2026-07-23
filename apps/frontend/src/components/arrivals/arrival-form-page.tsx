import { PageContent } from '@/components/app-layout/page-content'
import { StickyEditPageHeader } from '@/components/collections/sticky-edit-page-header'
import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { flattenFieldErrors } from '@/lib/utils'
import { ArrivalFormSchema, type ArrivalForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { getNewAssetTableColumns } from '../table-columns/new-asset-form-columns'
import { Button } from '../shadcn/button'
import { DataTable } from '../shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { SelectOptions } from '../shared/search-select/select-options'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'
import { CreateAssetModal } from './create-asset-modal'

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

export function ArrivalFormPage({
  defaultValues,
  pageConfig,
  breadcrumbs,
  onValidSubmit,
}: ArrivalFormPageProps): React.JSX.Element {
  const defaultWarehouse = useProfileDefaultWarehouse()
  const form = useForm<ArrivalForm>({
    resolver: zodResolver(ArrivalFormSchema),
    mode: 'onChange',
    defaultValues: defaultValues ?? getDefaultArrival(),
  })
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore((state) => state.organizations)
  const {
    fields: assets,
    append: addAsset,
    remove: deleteAsset,
    update: updateAsset,
  } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting, isDirty, isValid } = form.formState
  const guard = useNavigationGuard({ isDirty: isDirty && !isSubmitting })
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)
  const [editingAssetIndex, setEditingAssetIndex] = useState<number | null>(null)
  const assetTableColumns = useMemo(
    () =>
      getNewAssetTableColumns({
        onDelete: (id) => deleteAsset(id),
        onEdit: (index) => {
          setEditingAssetIndex(index)
          setIsAssetModalOpen(true)
        },
      }),
    [deleteAsset],
  )
  const editingAsset =
    editingAssetIndex !== null ? form.getValues('assets')[editingAssetIndex] : null

  function getDefaultArrival() {
    return {
      vendor: null,
      transporter: null,
      warehouse: defaultWarehouse ? getSelectOption(defaultWarehouse) : UNSELECTED,
      assets: [],
      comment: '',
    }
  }

  function submitArrival() {
    form.handleSubmit(onValidSubmit, onInvalidArrival)()
  }

  function onInvalidArrival(errors: FieldErrors<ArrivalForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, ['id'])}`, {
      position: 'top-center',
    })
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
        canSave={isValid}
        submittingText={pageConfig.submittingText}
        saveButtonText={pageConfig.saveButtonText}
        onSave={submitArrival}
      />
      <PageContent className="flex flex-col gap-4">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="border rounded-md p-2 flex flex-col gap-2"
        >
          <fieldset disabled={isSubmitting} className="contents">
            <FieldSet>
              <FieldLegend>General Arrival Information</FieldLegend>
              <FieldGroup className="grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl">
                <ControlledSearchSelectInput
                  control={form.control}
                  name="vendor"
                  options={orgs}
                  getLabel={(o) => o.name}
                  fieldLabel="Vendor"
                  fieldRequired={true}
                  className="max-w-60"
                />

                <ControlledSearchSelectInput
                  control={form.control}
                  name="transporter"
                  options={orgs}
                  getLabel={(o) => o.name}
                  fieldLabel="Transporter"
                  fieldRequired={true}
                  className="max-w-60"
                />

                <Controller
                  control={form.control}
                  name="warehouse"
                  render={({ field: { onChange, value: warehouse }, fieldState }) => (
                    <SelectOptions
                      selection={warehouse}
                      onSelectionChange={onChange}
                      options={activeWarehouses}
                      getLabel={(w) => w.city_code}
                      fieldLabel="Warehouse"
                      anyAllowed={false}
                      fieldRequired={true}
                      error={fieldState.invalid}
                      className="max-w-60"
                    />
                  )}
                />
              </FieldGroup>

              <Controller
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <Field className="max-w-xl">
                    <FieldLabel>Comments</FieldLabel>
                    <Textarea placeholder="Arrival notes…" className="resize-none" {...field} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="assets"
                render={({ fieldState }) => (
                  <div aria-live="polite">
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </div>
                )}
              />
            </FieldSet>
          </fieldset>
        </form>
        <CreateAssetModal
          open={isAssetModalOpen}
          onOpenChange={setIsAssetModalOpen}
          addNewAsset={addAsset}
          updateAsset={updateAsset}
          editingAsset={editingAsset}
          editingIndex={editingAssetIndex}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assets</h2>
            <Button
              variant="secondary"
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setEditingAssetIndex(null)
                setIsAssetModalOpen(true)
              }}
            >
              Create New Asset
            </Button>
          </div>
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
