import { OrgFormFields } from '@/components/settings/org-form-fields'
import { useOrgMergePreview } from '@/hooks/use-org'
import { useOrgMutations } from '@/hooks/use-org-mutations'
import { flattenFieldErrors } from '@/lib/utils'
import { OrgFormSchema, toOrgFormValues, type OrgForm } from '@/ui-types/org-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import type { OrgDetail, OrgMergePreview } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { MergeSummary } from './merge-summary'

interface MergeOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgs: OrgDetail[]
  onMerged: () => void
}

export function MergeOrgModal({
  open,
  onOpenChange,
  orgs,
  onMerged,
}: MergeOrgModalProps): React.JSX.Element {
  const ids = useMemo(() => orgs.map((org) => org.id), [orgs])
  const preview = useOrgMergePreview(ids)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge Organizations</DialogTitle>
        </DialogHeader>
        <MergeOrgBody
          preview={preview}
          orgs={orgs}
          onOpenChange={onOpenChange}
          onMerged={onMerged}
        />
      </DialogContent>
    </Dialog>
  )
}

function MergeOrgBody({
  preview,
  orgs,
  onOpenChange,
  onMerged,
}: Pick<MergeOrgModalProps, 'orgs' | 'onOpenChange' | 'onMerged'> & {
  preview: OrgMergePreview | undefined
}): React.JSX.Element {
  if (!preview) return <p className="text-sm text-muted-foreground">Checking references…</p>

  const winner = orgs.find((org) => org.id === preview.winner_id)
  if (!winner)
    return <p className="text-sm text-destructive">That organization is no longer available.</p>

  return (
    <MergeOrgForm
      preview={preview}
      winner={winner}
      onOpenChange={onOpenChange}
      onMerged={onMerged}
    />
  )
}

function MergeOrgForm({
  preview,
  winner,
  onOpenChange,
  onMerged,
}: Pick<MergeOrgModalProps, 'onOpenChange' | 'onMerged'> & {
  preview: OrgMergePreview
  winner: OrgDetail
}): React.JSX.Element {
  const { mergeOrgs } = useOrgMutations()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(() => toOrgFormValues(winner), [winner])
  const form = useForm<OrgForm>({ resolver: zodResolver(OrgFormSchema), values })

  async function onValidSubmit(data: OrgForm) {
    setIsSubmitting(true)
    try {
      await mergeOrgs(
        preview.candidates.map((candidate) => candidate.id),
        data,
      )
      toast.success('Organizations merged', { position: 'top-center' })
      onMerged()
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalidSubmit(errors: FieldErrors<OrgForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  return (
    <>
      <MergeSummary
        keptLabel={winner.name}
        candidates={preview.candidates.map((candidate) => ({
          id: candidate.id,
          label: candidate.name,
          referenceCount: candidate.reference_count,
        }))}
        winnerId={preview.winner_id}
        referenceNoun="reference"
      />
      <form onSubmit={(e) => e.preventDefault()}>
        <OrgFormFields control={form.control} />
      </form>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => form.handleSubmit(onValidSubmit, onInvalidSubmit)()}
          type="button"
          disabled={isSubmitting}
        >
          Merge Organizations
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}
