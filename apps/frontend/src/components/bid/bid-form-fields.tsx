import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/shadcn/field'
import { Textarea } from '@/components/shadcn/textarea'
import { ControlledLabelledDatePickerField } from '@/components/shared/date-picker'
import { PercentInput } from '@/components/shared/percent-input'
import { PriceInput } from '@/components/shared/price-input'
import { ControlledSearchSelectInput } from '@/components/shared/search-select/controlled-search-select-input'
import { useOrgs } from '@/hooks/use-org'
import type { BidForm } from '@/ui-types/bid-form-types'
import { Controller, type Control } from 'react-hook-form'

export function BidFormFields({ control }: { control: Control<BidForm> }): React.JSX.Element {
  const orgs = useOrgs()
  return (
    <FieldGroup className="grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl">
      <ControlledSearchSelectInput
        control={control}
        name="vendor"
        options={orgs}
        getLabel={(o) => o.name}
        fieldLabel="Vendor"
        fieldRequired={true}
        className="max-w-60"
      />
      <ControlledLabelledDatePickerField
        control={control}
        name="received_date"
        label="Date Received"
        fieldRequired={true}
        className="max-w-60"
      />
      <ControlledLabelledDatePickerField
        control={control}
        name="due_date"
        label="Due Date"
        fieldRequired={true}
        className="max-w-60"
      />
      <Controller
        control={control}
        name="margin_percent"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="max-w-60">
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
          <Field data-invalid={fieldState.invalid} className="max-w-60">
            <FieldLabel htmlFor={field.name}>
              Freight
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
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <Field className="col-span-3 max-w-xl">
            <FieldLabel>Notes</FieldLabel>
            <Textarea placeholder="Bid notes…" className="resize-none" {...field} />
          </Field>
        )}
      />
    </FieldGroup>
  )
}
