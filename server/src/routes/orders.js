import express from 'express';
import { nanoid } from 'nanoid';
import { Store } from '../lib/store.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(Store.getAll('orders'));
});

router.post('/', (req, res) => {
  const list = Store.getAll('orders');
  const order = { id: nanoid(), ...req.body, createdAt: new Date().toISOString() };
  list.push(order);
  Store.setAll('orders', list);
  res.status(201).json(order);
});

export default router;
