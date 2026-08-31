// Mirrors the `serial_normalized` / `barcode_normalized` generated columns on Asset and the
// `invoice_reference_normalized` column on Invoice. Backend queries compare against those
// columns; the frontend compares unsaved values to each other. Both sides must strip the same
// characters, so the function lives here rather than in either app.
export function normalizeForSearch(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]/g, '')
}
