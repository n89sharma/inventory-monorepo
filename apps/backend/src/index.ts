import { clerkMiddleware } from '@clerk/express'
import cors from 'cors'
import 'dotenv/config'
import express, { Request, Response } from 'express'
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

const app = express();
const isDev = process.env.NODE_ENV !== 'production'

morgan.token('id', (req: Request) => req.id)

app.use(clerkMiddleware())
app.use('/webhooks', webhookRoutes)
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://shiva-inv.vercel.app"]
}))
app.use(requestId)

if (isDev) {
  app.use(morgan(':id :method :url :status :response-time[0]ms'))
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
  console.log(`Server running on port ${PORT}`);
})