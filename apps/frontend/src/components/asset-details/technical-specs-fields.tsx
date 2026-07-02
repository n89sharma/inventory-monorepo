import {
  ChannelLabel,
  ConsumablesCell,
  ConsumablesGrid,
  ConsumablesRow,
  type Channel,
} from '@/components/asset-details/consumables-grid'
import { ControlledSearchSelectField } from '@/components/shared/search-select/controlled-search-select-field'
import { HorizontalField } from '@/components/shared/horizontal-field'
import { InputWithClearInline } from '@/components/shared/input-with-clear'
import { ReadinessPicker } from '@/components/shared/readiness/readiness-picker'
import { SearchSelectInput } from '@/components/shared/search-select/search-select-input'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { formatTitleCase } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  getSelectOption,
  isSelected,
  UNSELECTED,
  type SelectOption,
} from '@/ui-types/select-option-types'
import { useMemo, useState } from 'react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import type { Component, CoreFunction, Country, Status } from 'shared-types'
import { Input } from '../shadcn/input'
import MultipleSelector from '../shadcn/multiple-selector'

// Shared width for the single-line inputs across the Create/Edit Asset and Edit
// Specs modals — widest of the previous values so every box fits its content.
export const INPUT_WIDTH = 'max-w-[200px]'

const ALL_CHANNELS: Channel[] = ['C', 'M', 'Y', 'K']
const MONO_CHANNELS: Channel[] = ['K']

type CMYKFieldNames<T extends FieldValues> = {
  c: Path<T>
  m: Path<T>
  y: Path<T>
  k: Path<T>
}

export function ControlledTextInput<T extends FieldValues>({
  control,
  name,
  placeholder,
  className,
}: {
  control: Control<T>
  name: Path<T>
  placeholder?: string
  className?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          value={(field.value as string) ?? ''}
          onChange={(e) => field.onChange(e.target.value)}
          placeholder={placeholder ?? ''}
          aria-invalid={fieldState.invalid}
          className={className}
        />
      )}
    />
  )
}

function ControlledNumberInput<T extends FieldValues>({
  control,
  name,
  className,
}: {
  control: Control<T>
  name: Path<T>
  className?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={(field.value as number | null) ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') return field.onChange(null)
            const n = Number(raw)
            if (isNaN(n)) return field.onChange(null)
            field.onChange(Math.max(0, n))
          }}
          placeholder=""
          aria-invalid={fieldState.invalid}
          className={cn('tabular-nums', className)}
        />
      )}
    />
  )
}

const METER_THOUSANDS = 1000
const METER_INPUT_WIDTH = 'max-w-40'

function ControlledMeterInput<T extends FieldValues>({
  control,
  name,
  channel,
}: {
  control: Control<T>
  name: Path<T>
  channel: Channel
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <InputWithClearInline
          value={typeof field.value === 'number' ? field.value / METER_THOUSANDS : null}
          onValueChange={(val) =>
            field.onChange(typeof val === 'number' ? Math.max(0, val) * METER_THOUSANDS : null)
          }
          fieldLabel=""
          inputType="number"
          prefix={<ChannelLabel channel={channel} />}
          suffix="K"
          error={fieldState.invalid}
          className={METER_INPUT_WIDTH}
          inputClassName="text-right"
        />
      )}
    />
  )
}

function ControlledConsumablesRow<T extends FieldValues>({
  label,
  control,
  names,
  visibleChannels,
  required,
}: {
  label: string
  control: Control<T>
  names: CMYKFieldNames<T>
  visibleChannels: Channel[]
  required?: boolean
}) {
  const channels = [
    { letter: 'C', name: names.c },
    { letter: 'M', name: names.m },
    { letter: 'Y', name: names.y },
    { letter: 'K', name: names.k },
  ].filter((ch) => visibleChannels.includes(ch.letter as Channel))
  return (
    <ConsumablesRow label={label} required={required} columnCount={channels.length}>
      {channels.map((ch) => (
        <Controller
          key={ch.name}
          control={control}
          name={ch.name}
          render={({ field, fieldState }) => (
            <ConsumablesCell
              value={field.value as number | null}
              onChange={field.onChange}
              invalid={fieldState.invalid}
              ariaLabel={`${label} ${ch.letter}`}
            />
          )}
        />
      ))}
    </ConsumablesRow>
  )
}

function getCoreFunctionOptions(cfs: CoreFunction[]) {
  return cfs.map((f) => ({ id: f.id, label: f.accessory, value: f.accessory }))
}

/**
 * Internal-finisher picker. Mirrors the Model search input: a pill once a
 * Component is selected, a type-to-filter combobox otherwise. Options are the
 * brand's components when a brand is known, else the full cross-brand list
 * (labelled with the brand to disambiguate repeated names).
 */
function ControlledComponentSearch<T extends FieldValues>({
  control,
  name,
  brandName,
  className,
}: {
  control: Control<T>
  name: Path<T>
  brandName: string | null
  className?: string
}) {
  const components = useReferenceDataStore((state) => state.components)
  const [query, setQuery] = useState('')
  const options = useMemo(
    () => (brandName ? components.filter((c) => c.brand_name === brandName) : components),
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
          onSelectionChange={(c: Component) => {
            field.onChange(c)
            setQuery('')
          }}
          onQueryChange={setQuery}
          onClear={() => {
            field.onChange(null)
            setQuery('')
          }}
          options={options}
          getLabel={getLabel}
          placeholder=""
          clearLabel="Clear internal finisher"
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
export function TechnicalSpecsFields<T extends FieldValues>({
  control,
  isColour,
  brandName,
  renderAfterReadiness,
}: TechnicalSpecsFieldsProps<T>) {
  const readinesses = useReferenceDataStore((state) => state.readinesses)
  const countries = useReferenceDataStore((state) => state.countries)
  const coreFunctions = useReferenceDataStore((state) => state.coreFunctions)

  const p = (name: string) => name as Path<T>
  const channels = isColour ? ALL_CHANNELS : MONO_CHANNELS

  return (
    <>
      <div className="flex flex-col gap-2">
        <HorizontalField label="Readiness" required>
          <Controller
            control={control}
            name={p('readiness')}
            render={({ field: { onChange, value }, fieldState }) => {
              const readiness = value as SelectOption<Status>
              return (
                <ReadinessPicker
                  selection={isSelected(readiness) ? readiness.selected : null}
                  onChange={(s) => onChange(s ? getSelectOption(s) : UNSELECTED)}
                  options={readinesses}
                  error={fieldState.invalid}
                />
              )
            }}
          />
        </HorizontalField>

        {renderAfterReadiness}

        <HorizontalField label="Country of Origin" required>
          <ControlledSearchSelectField
            control={control}
            name={p('countryOfOrigin')}
            options={countries}
            getLabel={(c: Country) => formatTitleCase(c.name)}
            clearLabel="Clear country of origin"
            className={INPUT_WIDTH}
          />
        </HorizontalField>

        <HorizontalField label="Manufactured Year">
          <ControlledNumberInput
            control={control}
            name={p('manufacturedYear')}
            className={INPUT_WIDTH}
          />
        </HorizontalField>
      </div>

      <HorizontalField label="Meter" required>
        <div className="flex items-center gap-2">
          {isColour && (
            <ControlledMeterInput control={control} name={p('meterColour')} channel="C" />
          )}
          <ControlledMeterInput control={control} name={p('meterBlack')} channel="K" />
        </div>
      </HorizontalField>

      <ConsumablesGrid visibleChannels={channels}>
        <ControlledConsumablesRow
          label="Drum life"
          control={control}
          names={{ c: p('drumLifeC'), m: p('drumLifeM'), y: p('drumLifeY'), k: p('drumLifeK') }}
          visibleChannels={channels}
          required
        />
        <ControlledConsumablesRow
          label="Toner"
          control={control}
          names={{ c: p('tonerLifeC'), m: p('tonerLifeM'), y: p('tonerLifeY'), k: p('tonerLifeK') }}
          visibleChannels={channels}
          required
        />
      </ConsumablesGrid>

      <div className="flex flex-col gap-2">
        <HorizontalField label="Cassettes" required>
          <ControlledNumberInput control={control} name={p('cassettes')} className={INPUT_WIDTH} />
        </HorizontalField>
        <HorizontalField label="Internal Finisher">
          <ControlledComponentSearch
            control={control}
            name={p('component')}
            brandName={brandName}
            className={INPUT_WIDTH}
          />
        </HorizontalField>
        <HorizontalField label="Core Functions">
          <Controller
            name={p('coreFunctions')}
            control={control}
            render={({ field: { onChange, value } }) => (
              <MultipleSelector
                options={getCoreFunctionOptions(coreFunctions)}
                placeholder="Select functions…"
                emptyIndicator={<p>No results found.</p>}
                value={getCoreFunctionOptions(value as CoreFunction[])}
                onChange={(options) => {
                  const selectedIds = options.map((o) => o.id)
                  onChange(coreFunctions.filter((c) => selectedIds.includes(c.id)))
                }}
              />
            )}
          />
        </HorizontalField>
      </div>
    </>
  )
}
