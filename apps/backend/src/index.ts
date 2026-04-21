import { clerkMiddleware } from '@clerk/express'
import cors from 'cors'
import 'dotenv/config'
import express from 'express'
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
import userRoutes from './routes/userRoutes.js'

const app = express();

app.use(clerkMiddleware())
app.use(express.json());
app.use(cors({ origin: ["http://localhost:5173", "https://shiva-inv.vercel.app"] }))
app.use(morgan('dev'));

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})