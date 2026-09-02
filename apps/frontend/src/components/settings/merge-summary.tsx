interface MergeCandidate {
  id: number
  label: string
  referenceCount: number
}

interface MergeSummaryProps {
  keptLabel: string
  candidates: MergeCandidate[]
  winnerId: number
  referenceNoun: string
}

// A merge deletes rows, so it says plainly which one survives, which ones go, and how much moves
// with them. The kept row is the one already carrying the most references, so the fewest links
// break.
export function MergeSummary({
  keptLabel,
  candidates,
  winnerId,
  referenceNoun,
}: MergeSummaryProps): React.JSX.Element {
  const losers = candidates.filter((candidate) => candidate.id !== winnerId)
  const movingCount = losers.reduce((total, loser) => total + loser.referenceCount, 0)

  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
      <p>
        <span className="font-medium">{keptLabel}</span> is kept, and {losers.length}{' '}
        {losers.length === 1 ? 'row is' : 'rows are'} deleted. {movingCount}{' '}
        {movingCount === 1 ? referenceNoun : `${referenceNoun}s`} will move onto it.
      </p>
      <ul className="mt-2 space-y-0.5 text-muted-foreground">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            {candidate.id === winnerId ? 'Kept' : 'Deleted'} — {candidate.label} (
            {candidate.referenceCount})
          </li>
        ))}
      </ul>
      <p className="mt-2 text-muted-foreground">This cannot be undone.</p>
    </div>
  )
}
