import { makeAssetSearchRow } from '@/test/asset-factories'
import type { AssetSearchRow } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { buildCounterpartyWarning } from './counterparty-mismatch'

const EXPECTED_ID = 1

type Link = { reference: string; counterparty: { id: number; name: string } }

const link = (reference: string, id: number, name: string): Link => ({
  reference,
  counterparty: { id, name },
})

function warningFor(assets: AssetSearchRow[], linkByBarcode: Record<string, Link>) {
  return buildCounterpartyWarning({
    title: 'Vendor mismatch',
    assets,
    expectedCounterpartyId: EXPECTED_ID,
    linkOf: (asset) => linkByBarcode[asset.barcode] ?? null,
    description: 'invoiced by vendors other than ACM',
    groupLabelOf: (mismatch) => mismatch.counterparty.name,
    assetMessageOf: (mismatch) => `${mismatch.reference} is from ${mismatch.counterparty.name}`,
  })
}

const assets = (...barcodes: string[]) => barcodes.map((barcode) => makeAssetSearchRow({ barcode }))

describe('buildCounterpartyWarning', () => {
  it('returns nothing when every linked counterparty is the expected one', () => {
    expect(warningFor(assets('BC-1'), { 'BC-1': link('INV-1', EXPECTED_ID, 'ACM') })).toBeNull()
  })

  // An asset not yet invoiced has no counterparty to disagree with.
  it('returns nothing for assets with no link', () => {
    expect(warningFor(assets('BC-1', 'BC-2'), {})).toBeNull()
  })

  it('flags only the mismatched assets and counts them against every asset', () => {
    const warning = warningFor(assets('BC-1', 'BC-2', 'BC-3'), {
      'BC-1': link('INV-1', 2, 'BOB HORN'),
      'BC-2': link('INV-2', EXPECTED_ID, 'ACM'),
    })

    expect(warning?.title).toBe('Vendor mismatch')
    expect(warning?.summary).toBe('1 of 3 assets invoiced by vendors other than ACM: BOB HORN (1).')
    expect([...(warning?.assetWarnings ?? [])]).toEqual([['BC-1', 'INV-1 is from BOB HORN']])
  })

  it('names the three largest groups, largest first, and counts the rest', () => {
    const counterparties = ['KDI', 'ACM', 'ACM', 'WBM', 'WBM', 'WBM', 'OFFIX', 'GB-CFS']
    const rows = counterparties.map((_, index) => makeAssetSearchRow({ barcode: `BC-${index}` }))
    const links = Object.fromEntries(
      counterparties.map((name, index) => [`BC-${index}`, link(`INV-${index}`, index + 2, name)]),
    )

    expect(warningFor(rows, links)?.summary).toBe(
      '8 of 8 assets invoiced by vendors other than ACM: WBM (3), ACM (2), GB-CFS (1), +2 more.',
    )
  })
})
