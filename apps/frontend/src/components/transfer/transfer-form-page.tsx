import { PageContent } from '@/components/app-layout/page-content'
import { getFormAssetColumns } from '@/components/pages/column-defs/form-asset-columns'
import { DataTable } from '@/components/shadcn/data-table'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/shadcn/field'
import { Textarea } from '@/components/shadcn/textarea'
import {
  AddAssetsByBarcodeOrSerial,
  AddFromHoldButton,
} from '@/components/shared-collection-components/add-assets-to-create-form'
import { StickyEditPageHeader } from '@/components/shared-collection-components/sticky-edit-page-header'
import { ControlledSearchSelectInput } from '@/components/shared/controlled-search-select-input'
import { SelectOptions } from '@/components/shared/select-options'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { flattenFieldErrors } from '@/lib/utils'
import { getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { TransferFormSchema, type TransferForm } from '@/ui-types/transfer-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'

interface TransferFormPageProps {
  defaultValues?: TransferForm
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: TransferForm) => Promise<void>
}

export function TransferFormPage({
  defaultValues,
  pageConfig,
  breadcrumbs,
  onValidSubmit,
}: TransferFormPageProps): React.JSX.Element {
  const defaultWarehouse = useProfileDefaultWarehouse()
  const form = useForm<TransferForm>({
    resolver: zodResolver(TransferFormSchema),
    mode: 'onChange',
    defaultValues: defaultValues ?? getDefaultTransfer(),
  })
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore((state) => state.organizations)
  const {
    fields: assets,
    append: addAsset,
    remove: deleteAsset,
  } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting, isDirty, isValid } = form.formState
  const guard = useNavigationGuard({ isDirty: isDirty && !isSubmitting })

  const assetTableColumns = useMemo(() => getFormAssetColumns(deleteAsset), [deleteAsset])

  function getDefaultTransfer(): TransferForm {
    return {
      origin: defaultWarehouse ? getSelectOption(defaultWarehouse) : UNSELECTED,
      destination: UNSELECTED,
      transporter: null,
      comment: '',
      assets: [],
    }
  }

  function submitTransfer() {
    form.handleSubmit(onValidSubmit, onInvalidTransfer)()
  }

  function onInvalidTransfer(errors: FieldErrors<TransferForm>) {
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
        onSave={submitTransfer}
      />
      <PageContent className="flex flex-col gap-2">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="border rounded-md p-2 flex flex-col gap-2"
        >
          <fieldset disabled={isSubmitting} className="contents">
            <FieldSet>
              <FieldLegend>General Transfer Information</FieldLegend>
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
                      fieldLabel="Origin"
                      anyAllowed={false}
                      fieldRequired={true}
                      error={fieldState.invalid}
                      className="max-w-60"
                    />
                  )}
                />

                <Controller
                  control={form.control}
                  name="destination"
                  render={({ field: { onChange, value }, fieldState }) => (
                    <SelectOptions
                      selection={value}
                      onSelectionChange={onChange}
                      options={activeWarehouses}
                      getLabel={(w) => w.city_code}
                      fieldLabel="Destination"
                      anyAllowed={false}
                      fieldRequired={true}
                      error={fieldState.invalid}
                      className="max-w-60"
                    />
                  )}
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
                    <Textarea placeholder="Transfer notes…" className="resize-none" {...field} />
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
              onAddAsset={addAsset}
              disabled={isSubmitting}
            />
          </div>
          <AddAssetsByBarcodeOrSerial
            getAssets={() => form.getValues('assets')}
            onAddAsset={addAsset}
            entityName="transfer"
            disabled={isSubmitting}
            className="max-w-xl"
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
