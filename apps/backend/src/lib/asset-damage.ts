// A damage note only exists alongside the flag. Clearing the flag discards the note rather than
// stranding it on an asset that every report now reads as undamaged. Applied on every write
// path — arrival create, arrival asset update, and the technical specifications update — so the
// two columns can never disagree.
export function damageColumns(
  isDamaged: boolean,
  damageNotes: string | null,
): { is_damaged: boolean; damage_notes: string | null } {
  return { is_damaged: isDamaged, damage_notes: isDamaged ? damageNotes : null }
}
