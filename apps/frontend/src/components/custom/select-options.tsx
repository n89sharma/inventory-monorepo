import type React from "react"
import {
  Field,
  FieldLabel
} from "@/components/shadcn/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select"
import { type SelectOption, ANY_OPTION, getSelectOption, isSelected, UNSELECTED } from 'shared-types'

type SelectOptionsProps<T> = {
  selection: SelectOption<T>
  onSelectionChange: (selection: SelectOption<T>) => void
  options: T[]
  getLabel: (entity: T) => string
  getKey?: (entity: T) => string
  fieldLabel: string
  anyAllowed?: boolean
  fieldRequired?: boolean
  error?: boolean
  className?: string
}

export function SelectOptions<T>({
  fieldLabel,
  selection,
  options,
  onSelectionChange,
  getLabel,
  getKey,
  anyAllowed,
  fieldRequired,
  error,
  className }: SelectOptionsProps<T>): React.JSX.Element {

  function getKeyFromEntity(entity: T): string {
    return getKey ? getKey(entity) : String((entity as { id: number }).id)
  }

  function getValueFromSelection(selection: SelectOption<T>) {
    if (isSelected(selection))
      return getKeyFromEntity(selection.selected)
    return selection.state
  }

  function getSelectionFromKey(key: string): SelectOption<T> {
    if (key === 'ANY')
      return ANY_OPTION
    const found = options.find(o => getKeyFromEntity(o) === key)
    if (found) 
      return getSelectOption(found)
    return UNSELECTED
  }

  return (
    <Field className={className} data-invalid={error}>
      <FieldLabel>
        {fieldLabel}
        {fieldRequired && <span className="text-destructive">*</span>}
      </FieldLabel>
      <Select
        value={getValueFromSelection(selection)}
        onValueChange={key => onSelectionChange(getSelectionFromKey(key))}
      >
        <SelectTrigger aria-invalid={error}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {anyAllowed && <SelectItem key="ANY" value="ANY">Any</SelectItem>}
            {options?.map(o => (
              <SelectItem key={getKeyFromEntity(o)} value={getKeyFromEntity(o)}>{getLabel(o)}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
