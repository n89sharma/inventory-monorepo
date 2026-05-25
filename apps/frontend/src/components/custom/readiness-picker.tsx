import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { formatSentenceCase } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Status } from 'shared-types'
import { getReadinessIconConfig } from './readiness-icon'

export function ReadinessPicker(
  {
    selection,
    onChange,
    options,
    error,
  }: {
    selection: Status | null
    onChange: (s: Status | null) => void
    options: Status[]
    error?: boolean
  }
) {
  const value = selection ? String(selection.id) : ''
  return (
    <ToggleGroup
      type='single'
      value={value}
      onValueChange={next => {
        if (next === '') return onChange(null)
        onChange(options.find(o => String(o.id) === next) ?? null)
      }}
      variant='outline'
      size='sm'
      aria-invalid={error}
      className='flex-wrap gap-1.5'
    >
      {options.map(opt => {
        const { Icon, className: iconClassName, weight = 'regular' } = getReadinessIconConfig(opt.status)
        return (
          <ToggleGroupItem
            key={opt.id}
            value={String(opt.id)}
            className={cn(
              'h-7 gap-1.5 rounded-full pl-2 pr-3 text-xs font-medium',
              'data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground',
              'data-[state=on]:border-secondary data-[state=on]:hover:bg-secondary/80'
            )}
          >
            <Icon size={14} weight={weight} className={iconClassName} />
            {formatSentenceCase(opt.status)}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
