import { Field, FieldGroup, FieldLabel } from '@/components/shadcn/field'
import { Textarea } from '@/components/shadcn/textarea'
import { ControlledDatePickerField } from '@/components/shared/date-picker'
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
      <ControlledDatePickerField control={control} name="received_date" label="Date Received" />
      <ControlledDatePickerField control={control} name="due_date" label="Due Date" />
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
