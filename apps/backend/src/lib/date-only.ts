export function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function toYmdOrNull(date: Date | null): string | null {
  return date === null ? null : toYmd(date)
}

export function todayYmd(): string {
  return toYmd(new Date())
}
