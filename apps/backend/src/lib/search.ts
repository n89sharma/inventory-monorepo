export function normalizeForSearch(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]/g, '')
}
