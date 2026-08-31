import { DUPLICATE_ALLOWED_STATUS, normalizeForSearch } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { ConflictError } from './errors.js'

export interface SerialCandidate {
  serialNumber: string
  acknowledged: boolean
  // The asset this candidate is updating, so an unchanged serial never collides with itself.
  excludeAssetId: number | null
}

/**
 * An update only has to justify a serial number it actually changes. Without this, editing any
 * other field on an asset that already shares a serial with another — a duplicate someone
 * accepted deliberately in the past — would be rejected until re-acknowledged, so the asset
 * could never be edited again.
 */
export function buildUpdateSerialCandidates({
  assetId,
  prevSerialNumber,
  newSerialNumber,
  acknowledged,
}: {
  assetId: number
  prevSerialNumber: string
  newSerialNumber: string
  acknowledged: boolean
}): SerialCandidate[] {
  if (normalizeForSearch(prevSerialNumber) === normalizeForSearch(newSerialNumber)) return []
  return [{ serialNumber: newSerialNumber, acknowledged, excludeAssetId: assetId }]
}

/**
 * A serial number may only be reused when every asset still holding it was sold on — that machine
 * can be bought back. Any other status means the serial is still spoken for, and no acknowledgment
 * can permit a second machine carrying it.
 *
 * Two assets in one payload are both created IN_STOCK, so an in-payload collision is always
 * blocked too; `acknowledged` is not consulted for it.
 *
 * A sold match is permissible but must be deliberate: the client shows the warning and sets
 * `acknowledged`. This is the enforcement, and it must run inside the write transaction so two
 * concurrent writers cannot both pass.
 *
 * Candidates whose serial normalizes to an empty string are skipped — they cannot identify a
 * machine, and every one of them would otherwise match every other.
 */
export async function assertSerialDuplicatesAllowed(
  tx: Prisma.TransactionClient,
  candidates: SerialCandidate[],
): Promise<void> {
  const normalizedCandidates = candidates
    .map((candidate) => ({ candidate, normalized: normalizeForSearch(candidate.serialNumber) }))
    .filter((c) => c.normalized !== '')
  if (normalizedCandidates.length === 0) return

  const uniqueNormalized = [...new Set(normalizedCandidates.map((c) => c.normalized))]
  const persisted = await tx.asset.findMany({
    where: { serial_normalized: { in: uniqueNormalized } },
    select: {
      id: true,
      barcode: true,
      serial_normalized: true,
      status: { select: { status: true } },
    },
  })

  const seenNormalized = new Set<string>()
  for (const { candidate, normalized } of normalizedCandidates) {
    const matches = persisted.filter(
      (asset) => asset.serial_normalized === normalized && asset.id !== candidate.excludeAssetId,
    )

    const blockingMatch = matches.find((asset) => asset.status.status !== DUPLICATE_ALLOWED_STATUS)
    if (blockingMatch) {
      throw new ConflictError(
        `Serial number ${candidate.serialNumber} is already on asset ${blockingMatch.barcode}, which has not been sold`,
      )
    }
    if (seenNormalized.has(normalized)) {
      throw new ConflictError(
        `Serial number ${candidate.serialNumber} appears more than once in this request`,
      )
    }
    if (matches.length > 0 && !candidate.acknowledged) {
      throw new ConflictError(
        `Serial number ${candidate.serialNumber} already exists on asset ${matches[0].barcode}`,
      )
    }
    seenNormalized.add(normalized)
  }
}
