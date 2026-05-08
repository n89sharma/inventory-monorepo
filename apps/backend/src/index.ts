import { clerkMiddleware } from '@clerk/express'
import cors from 'cors'
import express, { Request, Response } from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import arrivalRoutes from './routes/arrivalRoutes.js'
import assetRoutes from './routes/assetRoutes.js'
import brandRoutes from './routes/brandRoutes.js'
import departureRoutes from './routes/depatureRoutes.js'
import holdRoutes from './routes/holdRoutes.js'
import invoiceRoutes from './routes/invoiceRoutes.js'
import modelRoutes from './routes/modelRoutes.js'
import organizationRoutes from './routes/organizationRoutes.js'
import constantRoutes from './routes/referenceRoutes.js'
import transferRoutes from './routes/transferRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import userRoutes from './routes/userRoutes.js'
import webhookRoutes from './routes/webhookRoutes.js'
import { errorHandler } from './lib/errorHandler.js'
import { requestId } from './middleware/requestId.js'
import { logger } from './lib/logger.js'

const isDev = process.env.NODE_ENV !== 'production'
if (isDev) { await import('dotenv/config') }

const app = express();

morgan.token('id', (req: Request) => req.id)

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://shiva-inv.vercel.app',
  ],
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(helmet.xContentTypeOptions())
app.use(helmet.frameguard({ action: 'deny' }))
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }))
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }))
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }))
app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }))
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  next()
})
app.use(clerkMiddleware())
app.use('/webhooks', webhookRoutes)
app.use(limiter)
app.use(express.json({ limit: '500kb' }))
app.use(requestId)

const red    = (s: string | number) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string | number) => `\x1b[33m${s}\x1b[0m`
const cyan   = (s: string | number) => `\x1b[36m${s}\x1b[0m`
const green  = (s: string | number) => `\x1b[32m${s}\x1b[0m`

function colorForStatus(status: number): string {
  if (status >= 500) return red(status)
  if (status >= 400) return yellow(status)
  if (status >= 300) return cyan(status)
  return green(status)
}

function colorForTime(ms: number): string {
  if (ms >= 500) return red(`${ms}ms`)
  if (ms >= 100) return yellow(`${ms}ms`)
  return green(`${ms}ms`)
}

if (isDev) {
  app.use(morgan((tokens, req: Request, res: Response) => {
    const status = Number(tokens['status'](req, res))
    const ms = Math.round(parseFloat(tokens['response-time'](req, res) ?? '0'))
    return `${req.id} ${tokens['method'](req, res)} ${tokens['url'](req, res)} ${colorForStatus(status)} ${colorForTime(ms)}`
  }))
} else {
  app.use(morgan((tokens, req: Request, res: Response) =>
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message:
        `${tokens['method'](req, res)} ${tokens['url'](req, res)} ` +
        `${tokens['status'](req, res)} ${tokens['response-time'](req, res)}ms`,
      requestId: req.id,
      method: tokens['method'](req, res),
      url: tokens['url'](req, res),
      status: Number(tokens['status'](req, res)),
      responseTime: Number(tokens['response-time'](req, res)),
      service: 'loon-backend',
      env: process.env.NODE_ENV ?? 'development',
    })
  ))
}

app.get('/', (req, res) => {
  res.send('Inventory API');
})

app.use('/reference', constantRoutes);
app.use('/brands', brandRoutes);
app.use('/assets', assetRoutes);
app.use('/arrivals', arrivalRoutes);
app.use('/departures', departureRoutes);
app.use('/transfers', transferRoutes);
app.use('/holds', holdRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/models', modelRoutes)
app.use('/organizations', organizationRoutes)
app.use('/users', userRoutes)
app.use('/search', searchRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})