const UNSAFE_FILENAME_CHARS = /[^A-Za-z0-9_-]+/g
const FILENAME_SEPARATOR = '-'
const FILENAME_SEPARATORS = new Set([FILENAME_SEPARATOR, '_'])
const MAX_FILENAME_STEM_LENGTH = 60

function trimSeparators(value: string): string {
  let start = 0
  let end = value.length
  while (start < end && FILENAME_SEPARATORS.has(value[start]!)) start += 1
  while (end > start && FILENAME_SEPARATORS.has(value[end - 1]!)) end -= 1
  return value.slice(start, end)
}

export function toFilenameStem(displayId: string, fallback: string): string {
  const sanitized = trimSeparators(
    trimSeparators(displayId.replace(UNSAFE_FILENAME_CHARS, FILENAME_SEPARATOR)).slice(
      0,
      MAX_FILENAME_STEM_LENGTH,
    ),
  )
  return sanitized || fallback
}

export function downloadFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
