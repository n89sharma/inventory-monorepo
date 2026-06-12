import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { formatSentenceCase } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { getSelectOption, isSelected, UNSELECTED, type SelectOption } from '@/ui-types/select-option-types'
import { useMemo, useState } from 'react'
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import type { Component, CoreFunction, Country, Status } from 'shared-types'
import { Input } from '../shadcn/input'
import MultipleSelector from '../shadcn/multiple-selector'
import { ConsumablesCell, ConsumablesGrid, ConsumablesRow } from './consumables-grid'
import { HorizontalField } from './horizontal-field'
import { InputWithClearInline } from './input-with-clear'
import { SearchSelectInput } from './search-select-input'
import { PopoverSearchInline } from './popover-search'
import { ReadinessPicker } from './readiness-picker'

const CMYK_LETTERS = ['C', 'M', 'Y', 'K'] as const

// Shared width for the single-line inputs across the Create/Edit Asset and Edit
// Specs modals — widest of the previous values so every box fits its content.
export const INPUT_WIDTH = 'max-w-[200px]'

const ALL_CHANNELS: Array<'C' | 'M' | 'Y' | 'K'> = ['C', 'M', 'Y', 'K']
const MONO_CHANNELS: Array<'C' | 'M' | 'Y' | 'K'> = ['K']

type CMYKFieldNames<T extends FieldValues> = {
  c: Path<T>
  m: Path<T>
  y: Path<T>
  k: Path<T>
}

export function ControlledTextInput<T extends FieldValues>(
  {
    control,
    name,
    placeholder,
    className,
  }: {
    control: Control<T>
    name: Path<T>
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
          placeholder={placeholder ?? ''}
          aria-invalid={fieldState.invalid}
          className={className}
        />
      )}
    />
  )
}

export function ControlledNumberInput<T extends FieldValues>(
  {
    control,
    name,
    className,
  }: {
    control: Control<T>
    name: Path<T>
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
          min={0}
          value={(field.value as number | null) ?? ''}
          onChange={e => {
            const raw = e.target.value
            if (raw === '') return field.onChange(null)
            const n = Number(raw)
            if (isNaN(n)) return field.onChange(null)
            field.onChange(Math.max(0, n))
          }}
          placeholder=''
          aria-invalid={fieldState.invalid}
          className={cn('tabular-nums', className)}
        />
      )}
    />
  )
}

function ControlledConsumablesRow<T extends FieldValues>(
  {
    label,
    control,
    names,
  }: {
    label: string
    control: Control<T>
    names: CMYKFieldNames<T>
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

function getCoreFunctionOptions(cfs: CoreFunction[]) {
  return cfs.map(f => ({ id: f.id, label: f.accessory, value: f.accessory }))
}

/**
 * Internal-finisher picker. Mirrors the Model search input: a pill once a
 * Component is selected, a type-to-filter combobox otherwise. Options are the
 * brand's components when a brand is known, else the full cross-brand list
 * (labelled with the brand to disambiguate repeated names).
 */
function ControlledComponentSearch<T extends FieldValues>(
  {
    control,
    name,
    brandName,
    className,
  }: {
    control: Control<T>
    name: Path<T>
    brandName: string | null
    className?: string
  }
) {
  const components = useReferenceDataStore(state => state.components)
  const [query, setQuery] = useState('')
  const options = useMemo(
    () => (brandName ? components.filter(c => c.brand_name === brandName) : components),
    [components, brandName],
  )
  const getLabel = (c: Component) => (brandName ? c.name : `${c.brand_name} — ${c.name}`)
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SearchSelectInput
          selection={field.value as Component | null}
          query={query}
          onSelectionChange={(c: Component) => { field.onChange(c); setQuery('') }}
          onQueryChange={setQuery}
          onClear={() => { field.onChange(null); setQuery('') }}
          options={options}
          searchKey='name'
          getLabel={getLabel}
          placeholder=''
          clearLabel='Clear internal finisher'
          className={className}
        />
      )}
    />
  )
}

interface TechnicalSpecsFieldsProps<T extends FieldValues> {
  control: Control<T>
  isColour: boolean
  brandName: string | null
  renderAfterReadiness?: React.ReactNode
}

/**
 * Renders the technical-specification fields shared by the Create/Edit Asset
 * modal and the Edit Technical Specifications modal. Order, names, widths,
 * placeholders and the CMYK required-channel hint live here once so the three
 * modals stay identical — edit this component and every modal changes.
 *
 * Generic over the form type because the two modals use different schemas
 * (`AssetForm` vs `SpecsForm`); both carry the same spec field names, so the
 * field paths are cast once via `p()`.
 */
export function TechnicalSpecsFields<T extends FieldValues>(
  { control, isColour, brandName, renderAfterReadiness }: TechnicalSpecsFieldsProps<T>
) {
  const readinesses = useReferenceDataStore(state => state.readinesses)
  const countries = useReferenceDataStore(state => state.countries)
  const coreFunctions = useReferenceDataStore(state => state.coreFunctions)

  const p = (name: string) => name as Path<T>

  return (
    <>
      <div className='flex flex-col gap-2'>
        <HorizontalField label='Readiness' required>
          <Controller
            control={control}
            name={p('readiness')}
            render={({ field: { onChange, value }, fieldState }) => {
              const readiness = value as SelectOption<Status>
              return (
                <ReadinessPicker
                  selection={isSelected(readiness) ? readiness.selected : null}
                  onChange={s => onChange(s ? getSelectOption(s) : UNSELECTED)}
                  options={readinesses}
                  error={fieldState.invalid}
                />
              )
            }}
          />
        </HorizontalField>

        {renderAfterReadiness}

        <HorizontalField label='Country of Origin' required>
          <Controller
            control={control}
            name={p('countryOfOrigin')}
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
                className={INPUT_WIDTH}
              />
            )}
          />
        </HorizontalField>

        <HorizontalField label='Manufactured Year'>
          <ControlledNumberInput
            control={control}
            name={p('manufacturedYear')}
            className={INPUT_WIDTH}
          />
        </HorizontalField>
      </div>

      <HorizontalField label='Meter' required>
        <div className='flex items-center gap-2'>
          <Controller
            control={control}
            name={p('meterColour')}
            render={({ field, fieldState }) => (
              <InputWithClearInline
                value={field.value as number | null}
                onValueChange={val => field.onChange(typeof val === 'number' ? Math.max(0, val) : null)}
                fieldLabel=''
                inputType='number'
                suffix='C'
                error={fieldState.invalid}
                className={INPUT_WIDTH}
              />
            )}
          />
          <Controller
            control={control}
            name={p('meterBlack')}
            render={({ field, fieldState }) => (
              <InputWithClearInline
                value={field.value as number | null}
                onValueChange={val => field.onChange(typeof val === 'number' ? Math.max(0, val) : null)}
                fieldLabel=''
                inputType='number'
                suffix='B'
                error={fieldState.invalid}
                className={INPUT_WIDTH}
              />
            )}
          />
        </div>
      </HorizontalField>

      <ConsumablesGrid requiredChannels={isColour ? ALL_CHANNELS : MONO_CHANNELS}>
        <ControlledConsumablesRow
          label='Drum life'
          control={control}
          names={{ c: p('drumLifeC'), m: p('drumLifeM'), y: p('drumLifeY'), k: p('drumLifeK') }}
        />
        <ControlledConsumablesRow
          label='Toner'
          control={control}
          names={{ c: p('tonerLifeC'), m: p('tonerLifeM'), y: p('tonerLifeY'), k: p('tonerLifeK') }}
        />
      </ConsumablesGrid>

      <div className='flex flex-col gap-2'>
        <HorizontalField label='Cassettes' required>
          <ControlledNumberInput
            control={control}
            name={p('cassettes')}
            className={INPUT_WIDTH}
          />
        </HorizontalField>
        <HorizontalField label='Internal Finisher'>
          <ControlledComponentSearch
            control={control}
            name={p('component')}
            brandName={brandName}
            className={INPUT_WIDTH}
          />
        </HorizontalField>
        <HorizontalField label='Core Functions'>
          <Controller
            name={p('coreFunctions')}
            control={control}
            render={({ field: { onChange, value } }) => (
              <MultipleSelector
                options={getCoreFunctionOptions(coreFunctions)}
                placeholder='Select functions…'
                emptyIndicator={<p>No results found.</p>}
                value={getCoreFunctionOptions(value as CoreFunction[])}
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
    </>
  )
}
