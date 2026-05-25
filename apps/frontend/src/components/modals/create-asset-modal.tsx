import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { AssetFormSchema, type ArrivalForm, type AssetForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, isSelected, UNSELECTED, type SelectOption } from '@/ui-types/select-option-types'
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
import type { CoreFunction, ModelSummary, Status } from 'shared-types'
import { formatSentenceCase } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { ControlledInputWithClear } from '../custom/controlled-input-with-clear'
import { ControlledPopoverSearch } from '../custom/controlled-popover-search'
import { UnsavedChangesDialog } from '../custom/unsaved-changes-dialog'
import { Button } from '../shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../shadcn/dialog'
import { Field, FieldLabel } from '../shadcn/field'
import { Input } from '../shadcn/input'
import MultipleSelector from '../shadcn/multiple-selector'

const CMYK_CHANNELS = [
  { letter: 'C', dotClass: 'bg-cyan-500' },
  { letter: 'M', dotClass: 'bg-fuchsia-500' },
  { letter: 'Y', dotClass: 'bg-yellow-500' },
  { letter: 'K', dotClass: 'bg-foreground' },
] as const

type CMYKFieldNames = {
  c: Path<AssetForm>
  m: Path<AssetForm>
  y: Path<AssetForm>
  k: Path<AssetForm>
}

function FormSection(
  { title, children }: { title: string; children: React.ReactNode }
) {
  return (
    <section className='flex flex-col gap-3'>
      <div className='flex items-center gap-3'>
        <h3 className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
          {title}
        </h3>
        <div className='h-px flex-1 bg-border' />
      </div>
      {children}
    </section>
  )
}

function ConsumablesRow(
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
    <div className='grid grid-cols-[80px_repeat(4,minmax(0,72px))_auto] items-center gap-2'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      {orderedNames.map((fieldName, i) => (
        <Controller
          key={fieldName}
          control={control}
          name={fieldName}
          render={({ field, fieldState }) => (
            <Input
              type='number'
              value={(field.value as number | null) ?? ''}
              onChange={e => {
                const raw = e.target.value
                if (raw === '') return field.onChange(null)
                const n = Number(raw)
                field.onChange(isNaN(n) ? null : n)
              }}
              placeholder='–'
              aria-invalid={fieldState.invalid}
              aria-label={`${label} ${CMYK_CHANNELS[i].letter}`}
              className='h-8 text-center tabular-nums'
            />
          )}
        />
      ))}
      <span className='text-xs text-muted-foreground'>%</span>
    </div>
  )
}

function ConsumablesGrid({ control }: { control: Control<AssetForm> }) {
  return (
    <div className='flex flex-col gap-2'>
      <div
        className='grid grid-cols-[80px_repeat(4,minmax(0,72px))_auto]
                   items-center gap-2 px-1'
      >
        <span />
        {CMYK_CHANNELS.map(c => (
          <div key={c.letter} className='flex items-center justify-center gap-1.5'>
            <span className={cn('size-2 rounded-full', c.dotClass)} />
            <span className='text-xs font-medium text-muted-foreground'>
              {c.letter}
            </span>
          </div>
        ))}
        <span />
      </div>
      <ConsumablesRow
        label='Drum life'
        control={control}
        names={{ c: 'drumLifeC', m: 'drumLifeM', y: 'drumLifeY', k: 'drumLifeK' }}
      />
      <ConsumablesRow
        label='Toner'
        control={control}
        names={{ c: 'tonerLifeC', m: 'tonerLifeM', y: 'tonerLifeY', k: 'tonerLifeK' }}
      />
    </div>
  )
}

function ReadinessPicker(
  {
    selection,
    onSelectionChange,
    options,
    error,
  }: {
    selection: SelectOption<Status>
    onSelectionChange: (s: SelectOption<Status>) => void
    options: Status[]
    error: boolean
  }
) {
  const selectedId = isSelected(selection) ? selection.selected.id : null
  return (
    <div
      role='radiogroup'
      aria-invalid={error}
      data-invalid={error}
      className='inline-flex flex-wrap gap-1.5'
    >
      {options.map(opt => {
        const active = opt.id === selectedId
        return (
          <button
            key={opt.id}
            type='button'
            role='radio'
            aria-checked={active}
            onClick={() =>
              onSelectionChange(active ? UNSELECTED : getSelectOption(opt))
            }
            className={cn(
              'h-7 rounded-full border px-3 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {formatSentenceCase(opt.status)}
          </button>
        )
      })}
    </div>
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
  const models = useModelStore(state => state.models)

  useEffect(() => {
    if (open && editingAsset) {
      newAssetForm.reset(editingAsset)
    } else if (open && !editingAsset) {
      newAssetForm.reset(getDefaultNewAsset())
    }
  }, [open, editingAsset])

  function getCoreFunctionOptions(cfs: CoreFunction[]) {
    return cfs.map(f => ({ id: f.id, label: f.accessory, value: f.accessory }))
  }

  function getDefaultNewAsset() {
    return {
      serialNumber: '',
      model: null,
      readiness: UNSELECTED,
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

  async function onValidAsset(asset: AssetForm) {
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
        newAssetForm.reset(getDefaultNewAsset())
        onOpenChange(false)
      } catch {
        // interceptor already showed the error toast — keep modal open
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    addNewAsset!(asset)
    newAssetForm.reset(getDefaultNewAsset())
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
      <DialogContent className='md:max-w-2xl overflow-y-auto max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle>{modalConfig.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => e.preventDefault()} className='flex flex-col gap-6'>

          <div className='grid grid-cols-[1fr_200px] gap-4'>
            <ControlledPopoverSearch
              control={newAssetForm.control}
              name='model'
              options={models}
              searchKey='model_name'
              getLabel={(m: ModelSummary) => `${m.brand_name} ${m.model_name}`}
              fieldLabel='Model'
              fieldRequired={true}
            />
            <ControlledInputWithClear
              control={newAssetForm.control}
              name='serialNumber'
              fieldLabel='Serial Number'
              fieldRequired={true}
              inputType='string'
            />
          </div>

          <Controller
            control={newAssetForm.control}
            name='readiness'
            render={({ field: { onChange, value }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Readiness</FieldLabel>
                <ReadinessPicker
                  selection={value}
                  onSelectionChange={onChange}
                  options={readinesses}
                  error={fieldState.invalid}
                />
              </Field>
            )}
          />

          <FormSection title='Usage'>
            <div className='grid grid-cols-[140px_140px] gap-4'>
              <ControlledInputWithClear
                control={newAssetForm.control}
                name='meterBlack'
                fieldLabel='Meter — Black'
                fieldRequired={true}
                inputType='number'
              />
              <ControlledInputWithClear
                control={newAssetForm.control}
                name='meterColour'
                fieldLabel='Meter — Colour'
                fieldRequired={true}
                inputType='number'
              />
            </div>
          </FormSection>

          <FormSection title='Consumables'>
            <ConsumablesGrid control={newAssetForm.control} />
          </FormSection>

          <FormSection title='Hardware'>
            <div className='flex flex-col gap-4'>
              <div className='grid grid-cols-[80px_120px] gap-4'>
                <ControlledInputWithClear
                  control={newAssetForm.control}
                  name='cassettes'
                  fieldLabel='Cassettes'
                  fieldRequired={true}
                  inputType='number'
                />
                <ControlledInputWithClear
                  control={newAssetForm.control}
                  name='internalFinisher'
                  fieldLabel='Internal Finisher'
                  inputType='string'
                />
              </div>
              <Field>
                <FieldLabel>Core Functions</FieldLabel>
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
              </Field>
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
