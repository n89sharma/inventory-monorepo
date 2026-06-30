import { PageContent } from '@/components/layout/page-content'
import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { flattenFieldErrors } from '@/lib/utils'
import {
  DepartureFormSchema,
  type DepartureForm,
  type DepartureFormAsset,
} from '@/ui-types/departure-form-types'
import { getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import type { RowSelectionState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { DEFAULT_OUTGOING_STATUS, type AssetSummary, type OutgoingStatus } from 'shared-types'
import { toast } from 'sonner'
import { AddAssetByBarcode, AddFromHoldButton } from '../../custom/add-assets-to-create-form'
import { ControlledSearchSelectInput } from '../../custom/controlled-search-select-input'
import { DepartureOutgoingStatusBar } from '../../custom/departure-outgoing-status-bar'
import { SelectOptions } from '../../custom/select-options'
import { StickyEditPageHeader } from '../../custom/sticky-edit-page-header'
import { UnsavedChangesDialog } from '../../custom/unsaved-changes-dialog'
import { DataTable } from '../../shadcn/data-table'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '../../shadcn/field'
import { Textarea } from '../../shadcn/textarea'
import { getDepartureFormAssetColumns } from '../column-defs/form-asset-columns'

const getAssetRowId = (asset: DepartureFormAsset) => asset.barcode

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

export function DepartureFormPage({
  defaultValues,
  pageConfig,
  breadcrumbs,
  onValidSubmit,
}: DepartureFormPageProps): React.JSX.Element {
  const defaultWarehouse = useProfileDefaultWarehouse()
  const form = useForm<DepartureForm>({
    resolver: zodResolver(DepartureFormSchema),
    defaultValues: defaultValues ?? getDefaultDeparture(),
  })
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore((state) => state.organizations)
  const {
    fields: assets,
    append: addAsset,
    remove: deleteAsset,
    replace: replaceAssets,
  } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting, isDirty } = form.formState
  const guard = useNavigationGuard({ isDirty: isDirty && !isSubmitting })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const assetTableColumns = useMemo(() => getDepartureFormAssetColumns(deleteAsset), [deleteAsset])

  const selectedCount = assets.filter((a) => rowSelection[a.barcode]).length

  function addDepartureAsset(asset: AssetSummary) {
    addAsset({ ...asset, outgoing_status: DEFAULT_OUTGOING_STATUS })
  }

  function applyOutgoingStatus(status: OutgoingStatus) {
    const updated = form
      .getValues('assets')
      .map((asset) => (rowSelection[asset.barcode] ? { ...asset, outgoing_status: status } : asset))
    replaceAssets(updated)
    setRowSelection({})
  }

  function selectAllAssets() {
    setRowSelection(Object.fromEntries(assets.map((a) => [a.barcode, true])))
  }

  function getDefaultDeparture(): DepartureForm {
    return {
      origin: defaultWarehouse ? getSelectOption(defaultWarehouse) : UNSELECTED,
      customer: null,
      transporter: null,
      comment: '',
      assets: [],
    }
  }

  function submitDeparture() {
    form.handleSubmit(onValidSubmit, onInvalidDeparture)()
  }

  function onInvalidDeparture(errors: FieldErrors<DepartureForm>) {
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
        submittingText={pageConfig.submittingText}
        saveButtonText={pageConfig.saveButtonText}
        onSave={submitDeparture}
      />
      <PageContent className="flex flex-col gap-2">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="border rounded-md p-2 flex flex-col gap-2"
        >
          <fieldset disabled={isSubmitting} className="contents">
            <FieldSet>
              <FieldLegend>General Departure Information</FieldLegend>
              <FieldGroup className="grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl">
                <Controller
                  control={form.control}
                  name="origin"
                  render={({ field: { onChange, value }, fieldState }) => (
                    <SelectOptions
                      selection={value}
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

                <ControlledSearchSelectInput
                  control={form.control}
                  name="customer"
                  options={orgs}
                  getLabel={(o) => o.name}
                  fieldLabel="Customer"
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
              </FieldGroup>

              <Controller
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <Field className="max-w-xl">
                    <FieldLabel>Comments</FieldLabel>
                    <Textarea placeholder="Departure notes…" className="resize-none" {...field} />
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assets</h2>
            <AddFromHoldButton
              getAssets={() => form.getValues('assets')}
              onAddAsset={addDepartureAsset}
              disabled={isSubmitting}
            />
          </div>
          <AddAssetByBarcode
            getAssets={() => form.getValues('assets')}
            onAddAsset={addDepartureAsset}
            entityName="departure"
            disabled={isSubmitting}
            className="max-w-xl"
          />
          <DataTable
            columns={assetTableColumns}
            data={assets}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            getRowId={getAssetRowId}
          />
          <DepartureOutgoingStatusBar
            selectedCount={selectedCount}
            totalCount={assets.length}
            onSelectAll={selectAllAssets}
            onClear={() => setRowSelection({})}
            onApply={applyOutgoingStatus}
          />
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
