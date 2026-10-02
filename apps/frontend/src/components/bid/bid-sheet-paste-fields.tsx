import { Checkbox } from '@/components/shadcn/checkbox'
import { Field, FieldLabel } from '@/components/shadcn/field'
import { Textarea } from '@/components/shadcn/textarea'
import { useId } from 'react'

interface BidSheetPasteFieldsProps {
  text: string
  onTextChange: (text: string) => void
  firstRowIsHeaders: boolean
  onFirstRowIsHeadersChange: (firstRowIsHeaders: boolean) => void
}

export function BidSheetPasteFields({
  text,
  onTextChange,
  firstRowIsHeaders,
  onFirstRowIsHeadersChange,
}: BidSheetPasteFieldsProps): React.JSX.Element {
  const headerCheckboxId = useId()
  return (
    <>
      <Textarea
        aria-label="Pasted rows"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        wrap="off"
        className="h-64 resize-none font-mono text-xs"
      />
      <Field orientation="horizontal" className="w-fit items-center gap-2">
        <Checkbox
          id={headerCheckboxId}
          checked={firstRowIsHeaders}
          onCheckedChange={(checked) => onFirstRowIsHeadersChange(checked === true)}
        />
        <FieldLabel htmlFor={headerCheckboxId}>First row is headers</FieldLabel>
      </Field>
    </>
  )
}
