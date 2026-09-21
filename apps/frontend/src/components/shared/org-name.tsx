import { formatOrgName } from '@/lib/formatters'

// Shortened for display; the full name stays on hover and in exports.
export function OrgName({ name }: { name: string | null | undefined }) {
  if (!name) return null
  return <span title={name}>{formatOrgName(name)}</span>
}
