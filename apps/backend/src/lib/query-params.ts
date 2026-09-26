export const toNumberArray = (val: unknown) => {
  if (val === undefined) return []
  return Array.isArray(val) ? val : [val]
}
