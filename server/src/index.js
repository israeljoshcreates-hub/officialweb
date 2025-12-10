import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter from './routes/products.js';
import discountsRouter from './routes/discounts.js';
import authRouter, { authMiddleware } from './routes/auth.js';
import ordersRouter from './routes/orders.js';
import mongoose from 'mongoose';
import Product from './models/Product.js';
import Discount from './models/Discount.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

// ------------------
// DATABASE CONNECT
// ------------------
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// ------------------
// HEALTH + SEED STATUS
// ------------------
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/seed-status', async (req, res) => {
  try {
    const [productCount, discounts] = await Promise.all([
      Product.countDocuments({}),
      Discount.find({}).lean()
    ]);

    const productIdsSet = new Set(
      (await Product.find({}).select('_id').lean()).map(p => String(p._id))
    );

    let invalidRefs = 0;
    for (const d of discounts) {
      const refs = (d.productIds || []).map(id => String(id));
      const bad = refs.filter(id => !productIdsSet.has(id));
      if (bad.length) invalidRefs++;
    }

    res.json({
      products: productCount,
      discounts: discounts.length,
      discountsWithInvalidProductIds: invalidRefs
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to compute seed status',
      details: err.message
    });
  }
});

// ------------------
// ROUTES
// ------------------
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/discounts', discountsRouter);
app.use('/api/orders', ordersRouter);

// ------------------
// START SERVER
// ------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
