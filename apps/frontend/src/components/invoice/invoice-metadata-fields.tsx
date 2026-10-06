import { useOrgs } from '@/hooks/use-org'
import type { InvoiceMetadataForm } from '@/ui-types/invoice-form-types'
import { startOfDay } from 'date-fns'
import { Controller, type Control } from 'react-hook-form'
import { Checkbox } from '../shadcn/checkbox'
import { Field, FieldError, FieldLabel } from '../shadcn/field'
import { Input } from '../shadcn/input'
import { ControlledDatePickerField } from '../shared/date-picker'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'

export function InvoiceMetadataFields({
  control,
  organizationLabel,
}: {
  control: Control<InvoiceMetadataForm>
  organizationLabel: string
}): React.JSX.Element {
  const orgs = useOrgs()
  const today = startOfDay(new Date())

  return (
    <>
      <Controller
        control={control}
        name="invoice_reference"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Invoice Reference</FieldLabel>
            <Input placeholder="e.g. INV-001" aria-invalid={fieldState.invalid} {...field} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <ControlledDatePickerField
        control={control}
        name="invoice_date"
        label="Invoice Date"
        className="self-end pb-0.5"
        disabled={{ after: today }}
        endMonth={today}
      />
      <ControlledSearchSelectInput
        control={control}
        name="organization"
        options={orgs}
        getLabel={(o) => o.name}
        fieldLabel={organizationLabel}
        fieldRequired={true}
      />
      <Controller
        control={control}
        name="is_cleared"
        render={({ field }) => (
          <Field orientation="horizontal" className="w-fit items-center gap-2 self-end pb-2">
            <Checkbox id="is_cleared" checked={field.value} onCheckedChange={field.onChange} />
            <FieldLabel htmlFor="is_cleared">Cleared</FieldLabel>
          </Field>
        )}
      />
    </>
  )
}
