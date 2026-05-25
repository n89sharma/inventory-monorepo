import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { AssetFormSchema, type ArrivalForm, type AssetForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, isSelected, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import {
  Controller,
  useForm,
  type Control,
  type Path,
  type UseFieldArrayAppend,
  type UseFieldArrayUpdate,
} from 'react-hook-form'
import type { CoreFunction, Country, ModelSummary, Status } from 'shared-types'
import { formatSentenceCase } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { ConsumablesCell, ConsumablesGrid, ConsumablesRow } from '../custom/consumables-grid'
import { FormSection } from '../custom/form-section'
import { HorizontalField } from '../custom/horizontal-field'
import { PopoverSearchInline } from '../custom/popover-search'
import { ReadinessPicker } from '../custom/readiness-picker'
import { UnsavedChangesDialog } from '../custom/unsaved-changes-dialog'
import { Button } from '../shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../shadcn/dialog'
import { Input } from '../shadcn/input'
import MultipleSelector from '../shadcn/multiple-selector'

type CMYKFieldNames = {
  c: Path<AssetForm>
  m: Path<AssetForm>
  y: Path<AssetForm>
  k: Path<AssetForm>
}

const CMYK_LETTERS: Array<'C' | 'M' | 'Y' | 'K'> = ['C', 'M', 'Y', 'K']

function ControlledConsumablesRow(
  {
    label,
    control,
    names,
  }: {
    label: string
    control: Control<AssetForm>
    names: CMYKFieldNames
  }
) {
  const orderedNames = [names.c, names.m, names.y, names.k]
  return (
    <ConsumablesRow label={label}>
      {orderedNames.map((fieldName, i) => (
        <Controller
          key={fieldName}
          control={control}
          name={fieldName}
          render={({ field, fieldState }) => (
            <ConsumablesCell
              value={field.value as number | null}
              onChange={field.onChange}
              invalid={fieldState.invalid}
              ariaLabel={`${label} ${CMYK_LETTERS[i]}`}
            />
          )}
        />
      ))}
    </ConsumablesRow>
  )
}

function ControlledTextInput(
  {
    control,
    name,
    placeholder,
    className,
  }: {
    control: Control<AssetForm>
    name: Path<AssetForm>
    placeholder?: string
    className?: string
  }
) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          value={(field.value as string) ?? ''}
          onChange={e => field.onChange(e.target.value)}
          placeholder={placeholder ?? '—'}
          aria-invalid={fieldState.invalid}
          className={className}
        />
      )}
    />
  )
}

function ControlledNumberInput(
  {
    control,
    name,
    className,
  }: {
    control: Control<AssetForm>
    name: Path<AssetForm>
    className?: string
  }
) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          type='number'
          inputMode='numeric'
          value={(field.value as number | null) ?? ''}
          onChange={e => {
            const raw = e.target.value
            if (raw === '') return field.onChange(null)
            const n = Number(raw)
            field.onChange(isNaN(n) ? null : n)
          }}
          placeholder='0'
          aria-invalid={fieldState.invalid}
          className={cn('tabular-nums', className)}
        />
      )}
    />
  )
}

interface AssetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addNewAsset?: UseFieldArrayAppend<ArrivalForm, 'assets'>
  updateAsset?: UseFieldArrayUpdate<ArrivalForm, 'assets'>
  editingAsset?: AssetForm | null
  editingIndex?: number | null
  onCreateAsset?: (asset: AssetForm) => Promise<void>
  onUpdateAsset?: (asset: AssetForm) => Promise<void>
}

export function AssetModal({
  open,
  onOpenChange,
  addNewAsset,
  updateAsset,
  editingAsset,
  editingIndex,
  onCreateAsset,
  onUpdateAsset,
}: AssetModalProps): React.JSX.Element {
  const isEditMode = editingAsset != null
  const [isSubmitting, setIsSubmitting] = useState(false)

  const modalConfig = {
    title: isEditMode ? 'Edit Asset' : 'Create Asset',
    submitLabel: isEditMode ? 'Update Asset' : 'Save Asset',
  }

  const newAssetForm = useForm<AssetForm>({
    resolver: zodResolver(AssetFormSchema),
    defaultValues: getDefaultNewAsset(),
  })
  const isDirty = newAssetForm.formState.isDirty
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const readinesses = useReferenceDataStore(state => state.readinesses)
  const coreFunctions = useReferenceDataStore(state => state.coreFunctions)
  const countries = useReferenceDataStore(state => state.countries)
  const models = useModelStore(state => state.models)

  useEffect(() => {
    if (open && editingAsset) {
      newAssetForm.reset(editingAsset)
    } else if (open && !editingAsset) {
      newAssetForm.reset(getDefaultNewAsset(readinesses))
    }
  }, [open, editingAsset, readinesses])

  function getCoreFunctionOptions(cfs: CoreFunction[]) {
    return cfs.map(f => ({ id: f.id, label: f.accessory, value: f.accessory }))
  }

  function getDefaultNewAsset(allReadinesses: Status[] = []) {
    const untested = allReadinesses.find(r => r.status === 'UNTESTED')
    return {
      serialNumber: '',
      model: null,
      readiness: untested ? getSelectOption(untested) : UNSELECTED,
      countryOfOrigin: null,
      meterBlack: null,
      meterColour: null,
      cassettes: null,
      internalFinisher: '',
      coreFunctions: [],
      drumLifeC: null,
      drumLifeM: null,
      drumLifeY: null,
      drumLifeK: null,
      tonerLifeC: null,
      tonerLifeM: null,
      tonerLifeY: null,
      tonerLifeK: null,
    }
  }

  async function onValidAsset(rawAsset: AssetForm) {
    const asset: AssetForm = {
      ...rawAsset,
      drumLifeC: rawAsset.drumLifeC ?? 0,
      drumLifeM: rawAsset.drumLifeM ?? 0,
      drumLifeY: rawAsset.drumLifeY ?? 0,
      tonerLifeC: rawAsset.tonerLifeC ?? 0,
      tonerLifeM: rawAsset.tonerLifeM ?? 0,
      tonerLifeY: rawAsset.tonerLifeY ?? 0,
    }
    if (isEditMode && onUpdateAsset) {
      setIsSubmitting(true)
      try {
        await onUpdateAsset(asset)
        newAssetForm.reset(asset)
        onOpenChange(false)
      } catch {
        // interceptor already showed the error toast — keep modal open
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    if (isEditMode) {
      updateAsset!(editingIndex!, asset)
      newAssetForm.reset(asset)
      onOpenChange(false)
      return
    }
    if (onCreateAsset) {
      setIsSubmitting(true)
      try {
        await onCreateAsset(asset)
        newAssetForm.reset(getDefaultNewAsset(readinesses))
        onOpenChange(false)
      } catch {
        // interceptor already showed the error toast — keep modal open
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    addNewAsset!(asset)
    newAssetForm.reset(getDefaultNewAsset(readinesses))
    onOpenChange(false)
  }

  function submitAsset() {
    newAssetForm.handleSubmit(onValidAsset)()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isDirty) {
      setConfirmCloseOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  function discardAndClose() {
    setConfirmCloseOpen(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='md:max-w-[624px] overflow-y-auto max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle>{modalConfig.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => e.preventDefault()} className='flex flex-col gap-6'>

          <div className='flex flex-col gap-2'>
            <HorizontalField label='Model' required>
              <Controller
                control={newAssetForm.control}
                name='model'
                render={({ field, fieldState }) => (
                  <PopoverSearchInline
                    selection={field.value as ModelSummary | null}
                    onSelectionChange={field.onChange}
                    onClear={() => field.onChange(null)}
                    options={models}
                    searchKey='model_name'
                    getLabel={(m: ModelSummary) => `${m.brand_name} ${m.model_name}`}
                    fieldLabel='Model'
                    fieldRequired={true}
                    placeholder=''
                    error={fieldState.invalid}
                  />
                )}
              />
            </HorizontalField>
            <HorizontalField label='Serial Number' required>
              <ControlledTextInput
                control={newAssetForm.control}
                name='serialNumber'
                className='max-w-[200px]'
              />
            </HorizontalField>
            <HorizontalField label='Readiness' required>
              <Controller
                control={newAssetForm.control}
                name='readiness'
                render={({ field: { onChange, value }, fieldState }) => (
                  <ReadinessPicker
                    selection={isSelected(value) ? value.selected : null}
                    onChange={s => onChange(s ? getSelectOption(s) : UNSELECTED)}
                    options={readinesses}
                    error={fieldState.invalid}
                  />
                )}
              />
            </HorizontalField>
            <HorizontalField label='Country of Origin' required>
              <Controller
                control={newAssetForm.control}
                name='countryOfOrigin'
                render={({ field, fieldState }) => (
                  <PopoverSearchInline
                    selection={field.value as Country | null}
                    onSelectionChange={field.onChange}
                    onClear={() => field.onChange(null)}
                    options={countries}
                    searchKey='name'
                    getLabel={(c: Country) => formatSentenceCase(c.name)}
                    fieldLabel='Country of Origin'
                    fieldRequired={true}
                    placeholder=''
                    error={fieldState.invalid}
                  />
                )}
              />
            </HorizontalField>
          </div>

          <FormSection title='Usage'>
            <div className='flex flex-col gap-2'>
              <HorizontalField label='Meter — Black' required>
                <ControlledNumberInput
                  control={newAssetForm.control}
                  name='meterBlack'
                  className='max-w-[160px]'
                />
              </HorizontalField>
              <HorizontalField label='Meter — Colour' required>
                <ControlledNumberInput
                  control={newAssetForm.control}
                  name='meterColour'
                  className='max-w-[160px]'
                />
              </HorizontalField>
            </div>
          </FormSection>

          <FormSection title='Consumables'>
            <ConsumablesGrid requiredChannels={['K']}>
              <ControlledConsumablesRow
                label='Drum life'
                control={newAssetForm.control}
                names={{ c: 'drumLifeC', m: 'drumLifeM', y: 'drumLifeY', k: 'drumLifeK' }}
              />
              <ControlledConsumablesRow
                label='Toner'
                control={newAssetForm.control}
                names={{ c: 'tonerLifeC', m: 'tonerLifeM', y: 'tonerLifeY', k: 'tonerLifeK' }}
              />
            </ConsumablesGrid>
          </FormSection>

          <FormSection title='Hardware'>
            <div className='flex flex-col gap-2'>
              <HorizontalField label='Cassettes' required>
                <ControlledNumberInput
                  control={newAssetForm.control}
                  name='cassettes'
                  className='max-w-[100px]'
                />
              </HorizontalField>
              <HorizontalField label='Internal Finisher'>
                <ControlledTextInput
                  control={newAssetForm.control}
                  name='internalFinisher'
                  className='max-w-[140px]'
                />
              </HorizontalField>
              <HorizontalField label='Core Functions'>
                <Controller
                  name='coreFunctions'
                  control={newAssetForm.control}
                  render={({ field: { onChange, value } }) => (
                    <MultipleSelector
                      options={getCoreFunctionOptions(coreFunctions)}
                      placeholder='Select functions…'
                      emptyIndicator={<p>No results found.</p>}
                      value={getCoreFunctionOptions(value)}
                      onChange={options =>
                        onChange(
                          coreFunctions.filter(c =>
                            options.map(o => o.id).includes(c.id),
                          ),
                        )
                      }
                    />
                  )}
                />
              </HorizontalField>
            </div>
          </FormSection>

        </form>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => handleOpenChange(false)}
            type='button'
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={submitAsset} type='button' disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : modalConfig.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        onDiscard={discardAndClose}
      />
    </Dialog>
  )
}
