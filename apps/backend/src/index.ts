import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import assetRoutes from './routes/assets.js'
import arrivalRoutes from './routes/arrivals.js'
import departureRoutes from './routes/depatures.js'
import transferRoutes from './routes/transfers.js'
import holdRoutes from './routes/holds.js'
import invoiceRoutes from './routes/invoices.js'
import constantRoutes from './routes/constants.js'
import modelRoutes from './routes/models.js'
import organizationRoutes from './routes/organizations.js'
import userRoutes from './routes/users.js'

const app = express();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

app.use(express.json());
app.use(cors({ origin: ["http://localhost:5173", "https://shiva-inv.vercel.app"] }))
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Inventory API');
})

app.use('/constants', constantRoutes);
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