// Mirrors the `serial_normalized` / `barcode_normalized` generated columns on Asset and the
// `invoice_reference_normalized` column on Invoice. Backend queries compare against those
// columns; the frontend compares unsaved values to each other. Both sides must strip the same
// characters, so the function lives here rather than in either app.
export function normalizeForSearch(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Mirrors the `name_normalized` generated columns on Brand, Model and Organization, which back
// their duplicate-name unique indexes. Unlike normalizeForSearch this keeps `+`, because a model
// name carries it as meaning: IMAGEPRESS-C1 and IMAGEPRESS-C1+ are different models.
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9+]/g, '')
}
