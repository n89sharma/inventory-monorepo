export type CsvColumn<T> = {
  header: string
  value: (row: T) => string
}

const CSV_ROW_DELIMITER = '\r\n'
const CSV_QUOTE_REQUIRED = /["\r\n,]/

function toCsvField(value: string): string {
  if (CSV_QUOTE_REQUIRED.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCsvRow(fields: string[]): string {
  return fields.map(toCsvField).join(',')
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = toCsvRow(columns.map((c) => c.header))
  const body = rows.map((row) => toCsvRow(columns.map((c) => c.value(row))))
  return [header, ...body].join(CSV_ROW_DELIMITER)
}
