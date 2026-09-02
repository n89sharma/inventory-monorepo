import { ModelFormFields } from '@/components/settings/model-form-fields'
import { useModelMergePreview } from '@/hooks/use-model'
import { useModelMutations } from '@/hooks/use-model-mutations'
import { useAssetTypes, useBrands } from '@/hooks/use-reference-data'
import { flattenFieldErrors } from '@/lib/utils'
import { ModelFormSchema, toModelFormValues, type ModelForm } from '@/ui-types/model-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import type { ModelMergePreview, ModelSummary } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { MergeSummary } from './merge-summary'

interface MergeModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  models: ModelSummary[]
  onMerged: () => void
}

export function MergeModelModal({
  open,
  onOpenChange,
  models,
  onMerged,
}: MergeModelModalProps): React.JSX.Element {
  const ids = useMemo(() => models.map((model) => model.id), [models])
  const preview = useModelMergePreview(ids)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge Models</DialogTitle>
        </DialogHeader>
        <MergeModelBody
          preview={preview}
          models={models}
          onOpenChange={onOpenChange}
          onMerged={onMerged}
        />
      </DialogContent>
    </Dialog>
  )
}

function MergeModelBody({
  preview,
  models,
  onOpenChange,
  onMerged,
}: Pick<MergeModelModalProps, 'models' | 'onOpenChange' | 'onMerged'> & {
  preview: ModelMergePreview | undefined
}): React.JSX.Element {
  if (!preview) return <p className="text-sm text-muted-foreground">Checking assets…</p>

  const winner = models.find((model) => model.id === preview.winner_id)
  if (!winner) return <p className="text-sm text-destructive">That model is no longer available.</p>

  return (
    <MergeModelForm
      preview={preview}
      winner={winner}
      onOpenChange={onOpenChange}
      onMerged={onMerged}
    />
  )
}

function MergeModelForm({
  preview,
  winner,
  onOpenChange,
  onMerged,
}: Pick<MergeModelModalProps, 'onOpenChange' | 'onMerged'> & {
  preview: ModelMergePreview
  winner: ModelSummary
}): React.JSX.Element {
  const { mergeModels } = useModelMutations()
  const brands = useBrands()
  const assetTypes = useAssetTypes()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(
    () => toModelFormValues(winner, brands, assetTypes),
    [winner, brands, assetTypes],
  )
  const form = useForm<ModelForm>({ resolver: zodResolver(ModelFormSchema), values })

  async function onValidSubmit(data: ModelForm) {
    setIsSubmitting(true)
    try {
      await mergeModels(
        preview.candidates.map((candidate) => candidate.id),
        data,
      )
      toast.success('Models merged', { position: 'top-center' })
      onMerged()
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ModelForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  return (
    <>
      <MergeSummary
        keptLabel={`${winner.brand_name} ${winner.model_name}`}
        candidates={preview.candidates.map((candidate) => ({
          id: candidate.id,
          label: `${candidate.brand_name} ${candidate.model_name}`,
          referenceCount: candidate.reference_count,
        }))}
        winnerId={preview.winner_id}
        referenceNoun="asset"
      />
      <form onSubmit={(e) => e.preventDefault()}>
        <ModelFormFields control={form.control} />
      </form>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => form.handleSubmit(onValidSubmit, onInvalidSubmit)()}
          type="button"
          disabled={isSubmitting}
        >
          Merge Models
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}
