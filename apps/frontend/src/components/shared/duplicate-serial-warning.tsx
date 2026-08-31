import { InlineCaution, InlineWarning } from '@/components/shared/inline-warning'
import type { SerialNumberCheck } from '@/hooks/use-serial-number-check'
import { formatDate } from '@/lib/formatters'
import { isBlockingSerialMatch, type SerialNumberMatch } from 'shared-types'
import { Link } from 'react-router-dom'

const DRAFT_MATCH_MESSAGE = 'This serial number is already on an asset in this arrival.'

function AssetLink({ barcode }: { barcode: string }) {
  return (
    <Link to={`/assets/${barcode}`} className="font-medium underline">
      {barcode}
    </Link>
  )
}

// Deliberately generic about the status: nine of the ten block, and naming each one ("Held",
// "Scrapped") tells the user nothing they can act on from here.
function BlockingMatch({ match }: { match: SerialNumberMatch }) {
  return (
    <InlineWarning>
      This serial number is already on an asset in the system —{' '}
      <AssetLink barcode={match.barcode} /> ({match.brand} {match.model}
      {match.warehouse_code ? `, ${match.warehouse_code}` : ''})
    </InlineWarning>
  )
}

function SoldMatch({ match }: { match: SerialNumberMatch }) {
  return (
    <InlineCaution>
      This serial number was previously sold and departed on {formatDate(match.departed_at)} —{' '}
      <AssetLink barcode={match.barcode} />
    </InlineCaution>
  )
}

function DatabaseMatch({ match }: { match: SerialNumberMatch }) {
  if (isBlockingSerialMatch(match)) return <BlockingMatch match={match} />
  return <SoldMatch match={match} />
}

/**
 * Renders below the Serial Number field. A serial held by a sold asset may be reused once the
 * user confirms it, in amber; every other holder blocks the save outright, in red.
 */
export function DuplicateSerialWarning({ check }: { check: SerialNumberCheck }) {
  if (!check.hasMatch) return null

  const remainingCount = check.totalDatabaseMatchCount - check.databaseMatches.length

  return (
    <div className="flex flex-col gap-2">
      {check.draftMatch && <InlineWarning>{DRAFT_MATCH_MESSAGE}</InlineWarning>}
      {check.databaseMatches.map((match) => (
        <DatabaseMatch key={match.barcode} match={match} />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">and {remainingCount} more</span>
      )}
    </div>
  )
}
