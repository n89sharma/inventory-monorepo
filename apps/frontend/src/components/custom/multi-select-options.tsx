import { Button } from "@/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { Field, FieldLabel } from "@/components/shadcn/field"
import { CaretDownIcon } from "@phosphor-icons/react"
import type React from "react"

type MultiSelectOptionsProps<T extends { id: number }> = {
  selection: T[]
  onSelectionChange: (items: T[]) => void
  options: T[]
  getLabel: (entity: T) => string
  fieldLabel: string
  className?: string
}

export function MultiSelectOptions<T extends { id: number }>({
  selection,
  onSelectionChange,
  options,
  getLabel,
  fieldLabel,
  className,
}: MultiSelectOptionsProps<T>): React.JSX.Element {
  const label = selection.length === 0 ? 'Any' : `${selection.length} selected`
  const allSelected = options.length > 0 && selection.length === options.length

  function toggle(option: T, checked: boolean) {
    if (checked) onSelectionChange([...selection, option])
    else onSelectionChange(selection.filter(s => s.id !== option.id))
  }

  function toggleAll(checked: boolean) {
    onSelectionChange(checked ? options : [])
  }

  return (
    <Field className={className}>
      <FieldLabel>{fieldLabel}</FieldLabel>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            {label}
            <CaretDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={allSelected}
            onCheckedChange={toggleAll}
            onSelect={e => e.preventDefault()}
          >
            Select all
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {options.map(option => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={selection.some(s => s.id === option.id)}
              onCheckedChange={checked => toggle(option, checked)}
              onSelect={e => e.preventDefault()}
            >
              {getLabel(option)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  )
}
