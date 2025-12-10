import express from 'express';
import { authMiddleware } from './auth.js';
import Discount from '../models/Discount.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const list = await Discount.find({}).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch discounts', details: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const doc = await Discount.create({ active: true, ...req.body });
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create discount', details: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Discount.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update discount', details: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const r = await Discount.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete discount', details: err.message });
  }
});

export default router;
