import express from 'express';
import { authMiddleware } from './auth.js';
import Product from '../models/Product.js';
import Discount from '../models/Discount.js';

const router = express.Router();

function applyDiscounts(product, discounts) {
  let price = product.price;
  const now = new Date();
  for (const d of discounts) {
    if (d.active === false) continue;
    const within = (!d.startsAt || new Date(d.startsAt) <= now) && (!d.endsAt || new Date(d.endsAt) >= now);
    const applies = (!d.productIds?.length || d.productIds.some(id => String(id) === String(product._id))) && (!d.category || d.category === product.category);
    if (within && applies) {
      if (d.type === 'percent') price = +(price * (1 - d.value / 100)).toFixed(2);
      if (d.type === 'amount') price = +(Math.max(0, price - d.value).toFixed(2));
    }
  }
  return { ...product.toObject(), priceFinal: price };
}

router.get('/', async (req, res) => {
  try {
    const { flavor, minPrice, maxPrice, popularity, discount } = req.query;
    const q = {};
    if (flavor) q.flavors = flavor;
    let products = await Product.find(q).lean(false); // return doc for toObject
    const discounts = await Discount.find({});
    let list = products.map(p => applyDiscounts(p, discounts));
    if (minPrice) list = list.filter(p => p.priceFinal >= +minPrice);
    if (maxPrice) list = list.filter(p => p.priceFinal <= +maxPrice);
    if (discount === 'true') list = list.filter(p => p.priceFinal < p.price);
    if (popularity === 'desc') list = list.sort((a,b) => (b.popularity||0) - (a.popularity||0));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const item = await Product.findOne({ slug: req.params.slug });
    if (!item) return res.status(404).json({ error: 'Not found' });
    const discounts = await Discount.find({});
    res.json(applyDiscounts(item, discounts));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product', details: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const slug = (req.body.slug || req.body.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const doc = await Product.create({ ...req.body, slug });
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create product', details: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Product.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update product', details: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const r = await Product.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete product', details: err.message });
  }
});

export default router;
