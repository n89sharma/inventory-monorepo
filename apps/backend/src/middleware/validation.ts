import { isAfter } from 'date-fns'
import { NextFunction, Request, Response } from 'express'
import { INVOICE_TYPE } from 'shared-types'
import { z } from 'zod'
import { normalizeFromDate, normalizeToDate } from '../lib/date-range.js'

export const ArrivalListQuerySchema = z
  .object({
    fromDate: z.string(),
    toDate: z.string().optional(),
    warehouse: z.coerce.number().int().optional(),
    vendor: z.coerce.number().int().optional(),
  })
  .transform((data) => ({
    fromDate: normalizeFromDate(data.fromDate),
    toDate: normalizeToDate(data.toDate),
    warehouse: data.warehouse,
    vendor: data.vendor,
  }))
  .refine((data) => !isAfter(data.fromDate, data.toDate), {
    message: 'fromDate must be before toDate',
  })

export const DepartureListQuerySchema = z
  .object({
    fromDate: z.string(),
    toDate: z.string().optional(),
    warehouse: z.coerce.number().int().optional(),
    customer: z.coerce.number().int().optional(),
  })
  .transform((data) => ({
    fromDate: normalizeFromDate(data.fromDate),
    toDate: normalizeToDate(data.toDate),
    warehouse: data.warehouse,
    customer: data.customer,
  }))
  .refine((data) => !isAfter(data.fromDate, data.toDate), {
    message: 'fromDate must be before toDate',
  })

export const InvoiceListQuerySchema = z
  .object({
    fromDate: z.string(),
    toDate: z.string().optional(),
    invoiceType: z.enum([INVOICE_TYPE.purchase, INVOICE_TYPE.sales]),
  })
  .transform((data) => ({
    fromDate: normalizeFromDate(data.fromDate),
    toDate: normalizeToDate(data.toDate),
    invoiceType: data.invoiceType,
  }))
  .refine((data) => !isAfter(data.fromDate, data.toDate), {
    message: 'fromDate must be before toDate',
  })

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      return res.status(400).json({ error: 'Request parameters incorrect' })
    }
    res.locals.query = result.data
    next()
  }
}
