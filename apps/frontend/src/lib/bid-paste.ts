import Papa from 'papaparse'
import { BID_UPLOAD_LIMITS, type UploadBidRows } from 'shared-types'

const TAB = '\t'

export type BidPasteResult = { ok: true; upload: UploadBidRows } | { ok: false; error: string }

function padTo(width: number, cells: string[]): string[] {
  return [...cells, ...Array<string>(width - cells.length).fill('')]
}

function limitError(headers: string[], rows: string[][]): string | null {
  if (headers.length > BID_UPLOAD_LIMITS.columns) {
    return `A bid can have at most ${BID_UPLOAD_LIMITS.columns} columns`
  }
  if (rows.length > BID_UPLOAD_LIMITS.rows) {
    return `A bid can have at most ${BID_UPLOAD_LIMITS.rows} rows`
  }
  if (headers.some((header) => header.length > BID_UPLOAD_LIMITS.headerLength)) {
    return `Headers can be at most ${BID_UPLOAD_LIMITS.headerLength} characters`
  }
  if (rows.some((row) => row.some((cell) => cell.length > BID_UPLOAD_LIMITS.cellLength))) {
    return `Cells can be at most ${BID_UPLOAD_LIMITS.cellLength} characters`
  }
  return null
}

export function parseBidPaste(text: string, firstRowIsHeaders: boolean): BidPasteResult {
  const parsed = Papa.parse<string[]>(text, { delimiter: TAB, skipEmptyLines: 'greedy' })
  const lines = parsed.data.map((cells) => cells.map((cell) => cell.trim()))
  const width = Math.max(0, ...lines.map((cells) => cells.length))
  const padded = lines.map((cells) => padTo(width, cells))

  const [firstLine, ...otherLines] = padded
  const headers = firstRowIsHeaders ? firstLine : undefined
  const rows = firstRowIsHeaders ? otherLines : padded
  const [firstRow, ...remainingRows] = rows
  if (firstRow === undefined) return { ok: false, error: 'Paste at least one row of data' }

  const resolvedHeaders = headers ?? padTo(width, [])
  const keptColumns = [...resolvedHeaders.keys()].filter(
    (index) => resolvedHeaders[index] !== '' || rows.some((row) => row[index] !== ''),
  )
  const keptHeaders = keptColumns.map((index) => resolvedHeaders[index] ?? '')
  const keepCells = (row: string[]) => keptColumns.map((index) => row[index] ?? '')

  const error = limitError(keptHeaders, rows)
  if (error !== null) return { ok: false, error }

  const [firstHeader, ...otherHeaders] = keptHeaders
  if (firstHeader === undefined) return { ok: false, error: 'Paste at least one column' }
  return {
    ok: true,
    upload: {
      headers: [firstHeader, ...otherHeaders],
      rows: [keepCells(firstRow), ...remainingRows.map(keepCells)],
    },
  }
}
