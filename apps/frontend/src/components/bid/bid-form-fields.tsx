import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/shadcn/field'
import { Textarea } from '@/components/shadcn/textarea'
import { ControlledLabelledDatePickerField } from '@/components/shared/date-picker'
import { PercentInput } from '@/components/shared/percent-input'
import { PriceInput } from '@/components/shared/price-input'
import { ControlledSearchSelectInput } from '@/components/shared/search-select/controlled-search-select-input'
import { useOrgs } from '@/hooks/use-org'
import type { BidForm } from '@/ui-types/bid-form-types'
import { Controller, type Control } from 'react-hook-form'

const DATE_FIELD_CLASS = 'w-40'
const MARGIN_FIELD_CLASS = 'w-24'
const FREIGHT_FIELD_CLASS = 'w-40'

export function BidFormFields({ control }: { control: Control<BidForm> }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <VendorAndDatesSection control={control} />
      <FieldSeparator />
      <PricingDefaultsSection control={control} />
      <FieldSeparator />
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea placeholder="Bid notes…" className="resize-none" {...field} />
          </Field>
        )}
      />
    </div>
  )
}

function VendorAndDatesSection({ control }: { control: Control<BidForm> }): React.JSX.Element {
  const orgs = useOrgs()
  return (
    <FieldGroup className="gap-4">
      <ControlledSearchSelectInput
        control={control}
        name="vendor"
        options={orgs}
        getLabel={(o) => o.name}
        fieldLabel="Vendor"
        fieldRequired={true}
      />
      <div className="flex gap-4">
        <ControlledLabelledDatePickerField
          control={control}
          name="received_date"
          label="Received"
          fieldRequired={true}
          className={DATE_FIELD_CLASS}
        />
        <ControlledLabelledDatePickerField
          control={control}
          name="due_date"
          label="Due"
          fieldRequired={true}
          className={DATE_FIELD_CLASS}
        />
      </div>
    </FieldGroup>
  )
}

function PricingDefaultsSection({ control }: { control: Control<BidForm> }): React.JSX.Element {
  return (
    <FieldSet className="gap-3">
      <FieldLegend className="mb-0">Pricing Defaults</FieldLegend>
      <FieldDescription>Applied to every asset. You can override this later.</FieldDescription>
      <div className="flex gap-4">
        <Controller
          control={control}
          name="margin_percent"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={MARGIN_FIELD_CLASS}>
              <FieldLabel htmlFor={field.name}>
                Margin
                <span className="text-destructive">*</span>
              </FieldLabel>
              <PercentInput
                id={field.name}
                value={field.value}
                onChange={field.onChange}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="transport_cost"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className={FREIGHT_FIELD_CLASS}>
              <FieldLabel htmlFor={field.name}>
                Freight per machine
                <span className="text-destructive">*</span>
              </FieldLabel>
              <PriceInput
                id={field.name}
                value={field.value}
                onChange={field.onChange}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </FieldSet>
  )
}
