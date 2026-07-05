import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { cn } from '@/lib/utils'
import { Fragment } from 'react'
import type { Status } from 'shared-types'
import { ReadinessPillContent, readinessPillClasses } from './readiness-pill'

export function ReadinessPicker({
  selection,
  onChange,
  options,
  disabledStatuses,
  error,
}: {
  selection: Status | null
  onChange: (s: Status | null) => void
  options: Status[]
  disabledStatuses?: string[]
  error?: boolean
}) {
  const disabled = new Set(disabledStatuses)
  const value = selection ? String(selection.id) : ''
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next === '') return onChange(null)
        onChange(options.find((o) => String(o.id) === next) ?? null)
      }}
      variant="outline"
      size="sm"
      aria-invalid={error}
      className="flex-wrap gap-1.5"
    >
      {options.map((opt) => {
        const item = (
          <ToggleGroupItem
            value={String(opt.id)}
            disabled={disabled.has(opt.status)}
            className={cn(
              readinessPillClasses,
              'h-7 gap-1.5 px-3 [&_svg]:size-3.5',
              'data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground',
              'data-[state=on]:border-secondary data-[state=on]:hover:bg-secondary/80',
            )}
          >
            <ReadinessPillContent status={opt.status} />
          </ToggleGroupItem>
        )
        // A disabled item is pointer-events-none, so wrap it to surface the
        // not-allowed cursor on hover.
        if (disabled.has(opt.status)) {
          return (
            <span key={opt.id} className="inline-flex cursor-not-allowed">
              {item}
            </span>
          )
        }
        return <Fragment key={opt.id}>{item}</Fragment>
      })}
    </ToggleGroup>
  )
}
