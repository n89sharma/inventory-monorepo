import { BID_UPLOAD_LIMITS } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { parseBidPaste } from './bid-paste'

describe('parseBidPaste', () => {
  it('splits tab-separated text and takes the first line as headers', () => {
    expect(parseBidPaste('Serial\tModel\nS1\tC3000\nS2\tC4500\n', true)).toEqual({
      ok: true,
      upload: {
        headers: ['Serial', 'Model'],
        rows: [
          ['S1', 'C3000'],
          ['S2', 'C4500'],
        ],
      },
    })
  })

  it('treats every line as data when there is no header row', () => {
    expect(parseBidPaste('S1\tC3000\nS2\tC4500', false)).toEqual({
      ok: true,
      upload: {
        headers: ['', ''],
        rows: [
          ['S1', 'C3000'],
          ['S2', 'C4500'],
        ],
      },
    })
  })

  it('keeps a quoted cell containing a line break as one cell', () => {
    const result = parseBidPaste('Serial\tNotes\nS1\t"Scratched\nside panel"', true)
    expect(result).toEqual({
      ok: true,
      upload: { headers: ['Serial', 'Notes'], rows: [['S1', 'Scratched\nside panel']] },
    })
  })

  it('pads short rows to the widest line', () => {
    const result = parseBidPaste('Serial\tModel\tMeter\nS1', true)
    expect(result).toMatchObject({ ok: true, upload: { rows: [['S1', '', '']] } })
  })

  it('drops blank lines', () => {
    const result = parseBidPaste('Serial\n\nS1\n   \nS2\n', true)
    expect(result).toMatchObject({ ok: true, upload: { rows: [['S1'], ['S2']] } })
  })

  it('drops lines that hold only empty cells', () => {
    const result = parseBidPaste('Serial\tModel\nS1\tC3000\n\t\nS2\tC4500', true)
    expect(result).toMatchObject({
      ok: true,
      upload: {
        rows: [
          ['S1', 'C3000'],
          ['S2', 'C4500'],
        ],
      },
    })
  })

  it('drops columns with no header and no values', () => {
    const result = parseBidPaste(
      '\tBrand\t\tModel\t\n1\tCanon\t\tC3000\t\n2\tRicoh\t\tC4500\t',
      true,
    )
    expect(result).toEqual({
      ok: true,
      upload: {
        headers: ['', 'Brand', 'Model'],
        rows: [
          ['1', 'Canon', 'C3000'],
          ['2', 'Ricoh', 'C4500'],
        ],
      },
    })
  })

  it('keeps a named column even when every value is empty', () => {
    const result = parseBidPaste('Serial\tBID:\nS1\t', true)
    expect(result).toMatchObject({ ok: true, upload: { headers: ['Serial', 'BID:'] } })
  })

  it('drops empty columns when there is no header row', () => {
    const result = parseBidPaste('S1\t\tC3000\nS2\t\tC4500', false)
    expect(result).toMatchObject({
      ok: true,
      upload: {
        headers: ['', ''],
        rows: [
          ['S1', 'C3000'],
          ['S2', 'C4500'],
        ],
      },
    })
  })

  it('rejects a paste with no data rows', () => {
    expect(parseBidPaste('Serial\tModel', true)).toEqual({
      ok: false,
      error: 'Paste at least one row of data',
    })
  })

  it('rejects a paste over the column limit', () => {
    const wide = Array.from({ length: BID_UPLOAD_LIMITS.columns + 1 }, (_, i) => `c${i}`).join('\t')
    expect(parseBidPaste(wide, false)).toMatchObject({ ok: false })
  })

  it('rejects a paste over the row limit', () => {
    const tall = Array.from({ length: BID_UPLOAD_LIMITS.rows + 1 }, (_, i) => `S${i}`).join('\n')
    expect(parseBidPaste(tall, false)).toMatchObject({ ok: false })
  })
})
