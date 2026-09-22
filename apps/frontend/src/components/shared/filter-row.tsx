import { cn } from '@/lib/utils'
import React from 'react'

const FILTER_CONTROL_HEIGHT = [
  '[&_[data-slot=button]]:h-7!',
  '[&_button[data-slot=dropdown-menu-trigger]]:h-7!',
  '[&_[data-slot=input]]:h-7!',
  '[&_[data-slot=input-group]]:h-7!',
  '[&_[data-slot=input-group-control]]:h-7!',
  '[&_[data-slot=input-group-addon]]:h-7!',
  '[&_button[data-slot=popover-trigger]]:h-7!',
  '[&_[data-slot=select-trigger]]:h-7!',
  '[&_[data-slot=toggle]]:h-7!',
  '[&_[data-slot=toggle-group-item]]:h-7!',
  '[&_[data-slot=search-select-selection]]:h-7!',
].join(' ')

export function FilterRow({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      className={cn('flex flex-row flex-wrap gap-2 items-end', FILTER_CONTROL_HEIGHT, className)}
    >
      {children}
    </div>
  )
}
