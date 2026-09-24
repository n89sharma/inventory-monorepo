import { ReleaseNoteFields } from '@/components/settings/release-note-fields'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { ReleaseNoteSections } from '@/components/whats-new/release-note-sections'
import { useAdminReleases } from '@/hooks/use-release'
import { useReleaseMutations } from '@/hooks/use-release-mutations'
import {
  EMPTY_NOTE,
  ReleaseFormSchema,
  toNoteFormValues,
  toSaveNote,
  type ReleaseForm,
} from '@/ui-types/release-form-types'
import { formatDateParam } from '@/lib/date-param'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import type { AdminRelease, ReleaseNote, SaveRelease } from 'shared-types'
import { toast } from 'sonner'

const RELEASES_PATH = '/settings/releases'

function toFormValues(release: AdminRelease): ReleaseForm {
  return {
    version: release.version ?? '',
    published_on: formatDateParam(release.published_at ?? new Date()),
    notes: release.notes.map(toNoteFormValues),
  }
}

function toPreviewNotes(values: ReleaseForm): ReleaseNote[] {
  return values.notes.map((note, index) => ({
    ...toSaveNote(note),
    id: index,
    sort_order: index,
  }))
}

export function ReleaseEditorPage() {
  const { releaseId } = useParams()
  const navigate = useNavigate()
  const releases = useAdminReleases()
  const mutations = useReleaseMutations()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const release = releases.find((candidate) => String(candidate.id) === releaseId) ?? null

  if (release === null) {
    return <p className="text-muted-foreground p-6 text-sm">Loading release…</p>
  }

  return (
    <ReleaseEditorForm
      key={release.id}
      release={release}
      confirmingDelete={confirmingDelete}
      onConfirmingDeleteChange={setConfirmingDelete}
      onDeleted={() => navigate(RELEASES_PATH)}
      mutations={mutations}
    />
  )
}

type ReleaseEditorFormProps = {
  release: AdminRelease
  confirmingDelete: boolean
  onConfirmingDeleteChange: (open: boolean) => void
  onDeleted: () => void
  mutations: ReturnType<typeof useReleaseMutations>
}

function ReleaseEditorForm({
  release,
  confirmingDelete,
  onConfirmingDeleteChange,
  onDeleted,
  mutations,
}: ReleaseEditorFormProps) {
  const form = useForm<ReleaseForm>({
    resolver: zodResolver(ReleaseFormSchema),
    defaultValues: toFormValues(release),
  })
  const notes = useFieldArray({ control: form.control, name: 'notes' })
  const values = useWatch({ control: form.control })
  const published = release.published_at !== null

  function toSavePayload(form: ReleaseForm, publishedAt: string | null): SaveRelease {
    return {
      version: form.version.trim().length > 0 ? form.version.trim() : null,
      published_at: publishedAt,
      notes: form.notes.map(toSaveNote),
    }
  }

  function chosenPublishedAt(form: ReleaseForm): string {
    return parseISO(form.published_on).toISOString()
  }

  const save = form.handleSubmit(async (formValues) => {
    try {
      const publishedAt = published ? chosenPublishedAt(formValues) : null
      await mutations.saveRelease(release.id, toSavePayload(formValues, publishedAt))
      toast.success('Release saved', { position: 'top-center' })
    } catch {
      toast.error('Could not save the release', { position: 'top-center' })
    }
  })

  const publish = form.handleSubmit(async (formValues) => {
    try {
      await mutations.saveRelease(
        release.id,
        toSavePayload(formValues, chosenPublishedAt(formValues)),
      )
      toast.success('Release published', { position: 'top-center' })
    } catch {
      toast.error('Could not publish the release', { position: 'top-center' })
    }
  })

  const unpublish = form.handleSubmit(async (formValues) => {
    try {
      await mutations.saveRelease(release.id, toSavePayload(formValues, null))
      toast.success('Release unpublished', { position: 'top-center' })
    } catch {
      toast.error('Could not unpublish the release', { position: 'top-center' })
    }
  })

  async function remove() {
    try {
      await mutations.deleteRelease(release.id)
      onDeleted()
    } catch {
      toast.error('Could not delete the release', { position: 'top-center' })
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{published ? 'Edit release' : 'Draft release'}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => onConfirmingDeleteChange(true)}>
            <TrashIcon /> Delete
          </Button>
          {published && (
            <Button type="button" variant="outline" onClick={unpublish}>
              Unpublish
            </Button>
          )}
          <Button type="button" variant="outline" onClick={save}>
            Save
          </Button>
          {!published && (
            <Button type="button" onClick={publish}>
              Publish
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="space-y-1 text-xs font-medium">
          <span>Date</span>
          <Input type="date" className="w-44" {...form.register('published_on')} />
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Version (internal)</span>
          <Input className="w-44" placeholder="v1.29.0" {...form.register('version')} />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          {notes.fields.map((field, index) => (
            <ReleaseNoteFields
              key={field.id}
              form={form}
              index={index}
              onMoveUp={() => index > 0 && notes.move(index, index - 1)}
              onMoveDown={() => index < notes.fields.length - 1 && notes.move(index, index + 1)}
              onRemove={() => notes.remove(index)}
            />
          ))}
          <Button type="button" variant="outline" onClick={() => notes.append(EMPTY_NOTE)}>
            <PlusIcon /> Add note
          </Button>
        </div>

        <aside className="space-y-3 rounded-md border p-4">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Preview
          </h2>
          <ReleaseNoteSections notes={toPreviewNotes(values as ReleaseForm)} />
        </aside>
      </div>

      <ConfirmActionDialog
        open={confirmingDelete}
        onOpenChange={onConfirmingDeleteChange}
        title="Delete this release?"
        confirmLabel="Delete Release"
        confirmVariant="destructive"
        icon={<TrashIcon />}
        onConfirm={remove}
      />
    </div>
  )
}
