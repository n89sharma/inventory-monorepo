import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { FieldErrors, FieldValues } from "react-hook-form"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function flattenFieldErrors<T extends FieldValues>(
  errors: FieldErrors<T>,
  excludeKeys: string[] = []): string {

  const messages: string[] = []

  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue

    if (Array.isArray(value)) {
      for (const [index, itemErrors] of value.entries()) {
        if (!itemErrors) continue
        for (const [fieldName, fieldError] of Object.entries(itemErrors)) {
          if (excludeKeys.includes(fieldName)) continue
          if (fieldError && typeof fieldError === 'object' && 'message' in fieldError && fieldError.message) {
            messages.push(`${key}${index} ${fieldName}: ${fieldError.message}`)
          }
        }
      }
    } else if (typeof value === 'object' && 'message' in value && value.message) {
      messages.push(String(value.message))
    }
  }

  if (messages.length <= 3) return messages.join(', ')
  return `${messages.slice(0, 3).join(', ')}, and more...`
}