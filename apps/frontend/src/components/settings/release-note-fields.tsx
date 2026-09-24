import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { Textarea } from '@/components/shadcn/textarea'
import { RELEASE_AREA_LABELS } from '@/components/whats-new/release-area-link'
import { formatTitleCase } from '@/lib/formatters'
import { NONE_VALUE, type ReleaseForm } from '@/ui-types/release-form-types'
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@phosphor-icons/react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import {
  PERMISSIONS,
  RELEASE_LINK_AREAS,
  RELEASE_SECTIONS,
  type ReleaseSection,
} from 'shared-types'

const SECTION_LABELS = {
  new: 'New',
  improved: 'Improved',
  fixed: 'Fixed',
} as const satisfies Record<ReleaseSection, string>

const SORTED_PERMISSIONS = [...PERMISSIONS].sort()

type ReleaseNoteFieldsProps = {
  form: UseFormReturn<ReleaseForm>
  index: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

export function ReleaseNoteFields({
  form,
  index,
  onMoveUp,
  onMoveDown,
  onRemove,
}: ReleaseNoteFieldsProps) {
  const bulletsError = form.formState.errors.notes?.[index]?.bullets

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Controller
          control={form.control}
          name={`notes.${index}.section`}
          render={({ field }) => (
            <label className="space-y-1 text-xs font-medium">
              <span>Section</span>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {RELEASE_SECTIONS.map((section) => (
                    <SelectItem key={section} value={section}>
                      {SECTION_LABELS[section]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
        />

        <Controller
          control={form.control}
          name={`notes.${index}.link_area`}
          render={({ field }) => (
            <label className="space-y-1 text-xs font-medium">
              <span>Go to</span>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={NONE_VALUE}>No link</SelectItem>
                  {RELEASE_LINK_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {RELEASE_AREA_LABELS[area]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
        />

        <Controller
          control={form.control}
          name={`notes.${index}.permission_key`}
          render={({ field }) => (
            <label className="space-y-1 text-xs font-medium">
              <span>Only for</span>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={NONE_VALUE}>Everyone</SelectItem>
                  {SORTED_PERMISSIONS.map((permission) => (
                    <SelectItem key={permission} value={permission}>
                      {formatTitleCase(permission)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
        />

        <div className="ml-auto flex gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} aria-label="Move up">
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            aria-label="Move down"
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove note"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      <label className="block space-y-1 text-xs font-medium">
        <span>Heading (optional)</span>
        <Input
          {...form.register(`notes.${index}.heading`)}
          placeholder="Vendor mismatch warnings"
        />
      </label>

      <label className="block space-y-1 text-xs font-medium">
        <span>Bullets — one per line</span>
        <Textarea
          {...form.register(`notes.${index}.bullets`)}
          rows={3}
          placeholder={
            'See a warning when the invoice vendor differs\nMismatched assets are highlighted'
          }
        />
        {bulletsError && <span className="text-destructive">{bulletsError.message}</span>}
      </label>
    </div>
  )
}
