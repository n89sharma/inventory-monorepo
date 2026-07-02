import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { cn } from '@/lib/utils'
import { CaretDownIcon } from '@phosphor-icons/react'
import React from 'react'

type MultiSelectMenuProps<T extends { id: number }> = {
  selection: T[]
  onSelectionChange: (items: T[]) => void
  options: T[]
  getLabel: (entity: T) => string
  trigger: React.ReactNode
  dividerAfterIds?: number[]
}

function MultiSelectMenu<T extends { id: number }>({
  selection,
  onSelectionChange,
  options,
  getLabel,
  trigger,
  dividerAfterIds,
}: MultiSelectMenuProps<T>): React.JSX.Element {
  const allSelected = options.length > 0 && selection.length === options.length
  const dividerSet = dividerAfterIds ? new Set(dividerAfterIds) : null

  function toggle(option: T, checked: boolean) {
    if (checked) onSelectionChange([...selection, option])
    else onSelectionChange(selection.filter((s) => s.id !== option.id))
  }

  function toggleAll(checked: boolean) {
    onSelectionChange(checked ? options : [])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={toggleAll}
          onSelect={(e) => e.preventDefault()}
        >
          Select all
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <React.Fragment key={option.id}>
            <DropdownMenuCheckboxItem
              checked={selection.some((s) => s.id === option.id)}
              onCheckedChange={(checked) => toggle(option, checked)}
              onSelect={(e) => e.preventDefault()}
            >
              {getLabel(option)}
            </DropdownMenuCheckboxItem>
            {dividerSet?.has(option.id) && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type MultiSelectOptionsProps<T extends { id: number }> = {
  selection: T[]
  onSelectionChange: (items: T[]) => void
  options: T[]
  getLabel: (entity: T) => string
  fieldLabel: string
  className?: string
  dividerAfterIds?: number[]
}

export function MultiSelectOptionsInline<T extends { id: number }>({
  selection,
  onSelectionChange,
  options,
  getLabel,
  fieldLabel,
  className,
  dividerAfterIds,
}: MultiSelectOptionsProps<T>): React.JSX.Element {
  const triggerLabel = selection.length === 0 ? fieldLabel : `${fieldLabel}: ${selection.length}`
  return (
    <MultiSelectMenu
      selection={selection}
      onSelectionChange={onSelectionChange}
      options={options}
      getLabel={getLabel}
      dividerAfterIds={dividerAfterIds}
      trigger={
        <Button variant="outline" className={cn('justify-between font-normal gap-2', className)}>
          {triggerLabel}
          <CaretDownIcon />
        </Button>
      }
    />
  )
}
