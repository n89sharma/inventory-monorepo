import {
  ComponentFormFields,
  LockedComponentBrand,
} from '@/components/settings/component-form-fields'
import { useComponentMergePreview } from '@/hooks/use-component'
import { useComponentMutations } from '@/hooks/use-component-mutations'
import { useBrands } from '@/hooks/use-reference-data'
import { flattenFieldErrors } from '@/lib/utils'
import {
  ComponentFormSchema,
  toComponentFormValues,
  type ComponentForm,
} from '@/ui-types/component-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import type { ComponentMergePreview, ComponentSummary } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { MergeSummary } from './merge-summary'

const LOCKED_BRAND_REASON = 'Only components of the same brand can be merged.'

interface MergeComponentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  components: ComponentSummary[]
  onMerged: () => void
}

export function MergeComponentModal({
  open,
  onOpenChange,
  components,
  onMerged,
}: MergeComponentModalProps): React.JSX.Element {
  const ids = useMemo(() => components.map((component) => component.id), [components])
  const preview = useComponentMergePreview(ids)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge Components</DialogTitle>
        </DialogHeader>
        <MergeComponentBody
          preview={preview}
          components={components}
          onOpenChange={onOpenChange}
          onMerged={onMerged}
        />
      </DialogContent>
    </Dialog>
  )
}

function MergeComponentBody({
  preview,
  components,
  onOpenChange,
  onMerged,
}: Pick<MergeComponentModalProps, 'components' | 'onOpenChange' | 'onMerged'> & {
  preview: ComponentMergePreview | undefined
}): React.JSX.Element {
  if (!preview) return <p className="text-sm text-muted-foreground">Checking assets…</p>

  const winner = components.find((component) => component.id === preview.winner_id)
  if (!winner)
    return <p className="text-sm text-destructive">That component is no longer available.</p>

  return (
    <MergeComponentForm
      preview={preview}
      winner={winner}
      onOpenChange={onOpenChange}
      onMerged={onMerged}
    />
  )
}

function MergeComponentForm({
  preview,
  winner,
  onOpenChange,
  onMerged,
}: Pick<MergeComponentModalProps, 'onOpenChange' | 'onMerged'> & {
  preview: ComponentMergePreview
  winner: ComponentSummary
}): React.JSX.Element {
  const { mergeComponents } = useComponentMutations()
  const brands = useBrands()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(() => toComponentFormValues(winner, brands), [winner, brands])
  const form = useForm<ComponentForm>({ resolver: zodResolver(ComponentFormSchema), values })

  async function onValidSubmit(data: ComponentForm) {
    setIsSubmitting(true)
    try {
      await mergeComponents(
        preview.candidates.map((candidate) => candidate.id),
        data,
      )
      toast.success('Components merged', { position: 'top-center' })
      onMerged()
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ComponentForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  return (
    <>
      <MergeSummary
        keptLabel={`${winner.brand_name} ${winner.name}`}
        candidates={preview.candidates.map((candidate) => ({
          id: candidate.id,
          label: `${candidate.brand_name} ${candidate.name}`,
          referenceCount: candidate.reference_count,
        }))}
        winnerId={preview.winner_id}
        referenceNoun="asset"
      />
      <form onSubmit={(e) => e.preventDefault()}>
        <ComponentFormFields control={form.control}>
          <LockedComponentBrand brandName={winner.brand_name} reason={LOCKED_BRAND_REASON} />
        </ComponentFormFields>
      </form>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => form.handleSubmit(onValidSubmit, onInvalidSubmit)()}
          type="button"
          disabled={isSubmitting}
        >
          Merge Components
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}
