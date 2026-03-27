import { isAfter } from 'date-fns'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

export function validateBarcode(req: Request, res: Response, next: NextFunction) {
  const barcode = req.body.barcode || req.params.barcode || req.query.barcode
  
  if (!barcode) {
    return res.status(400).json({ error: 'Barcode is required' })
  }
  
  if (!/^[A-Z]{3}-[A-Z]{2}-\d{6}$/.test(barcode)) {
    return res.status(400).json({ error: 'Invalid barcode format' })
  }
  
  next()
}

export const DateRangeWithWarehouseSchema = z.object({
  fromDate: z.string(),
  toDate: z.string().optional(),
  warehouse: z.coerce.number().int().optional(),
}).transform((data) => ({
  fromDate: new Date(data.fromDate),
  toDate: data.toDate ? new Date(data.toDate) : new Date(),
  warehouse: data.warehouse,
})).refine((data) => !isAfter(data.fromDate, data.toDate), {
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

export function validateDateRange(req: Request, res: Response, next: NextFunction) {
  if (!req.query.fromDate) {
    return res.status(400).json({ error: "fromDate not provided" })
  }

  const fromDate = new Date(String(req.query.fromDate))
  const toDate = req.query.toDate ? new Date(String(req.query.toDate)) : new Date()
  
  if (isAfter(fromDate, toDate)) {
    return res.status(400).json({ error: "fromDate must be before toDate" })
  }

  res.locals.parsedDates = {
    fromDate: fromDate,
    toDate: toDate
  }
  
  next()
}