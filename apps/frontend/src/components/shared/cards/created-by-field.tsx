import { SummaryField } from '@/components/shared/cards/summary-field'

const CREATED_BY_LABEL = 'Created by'

// Closes out the summary strip line, so it hugs the right edge whatever precedes it.
export function CreatedByField({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="ml-auto">
      <SummaryField label={CREATED_BY_LABEL} value={value} />
    </div>
  )
}
