import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');

const paths = {
  products: path.join(dataDir, 'products.json'),
  discounts: path.join(dataDir, 'discounts.json'),
  orders: path.join(dataDir, 'orders.json'),
  users: path.join(dataDir, 'users.json')
};

function readJson(file) {
  if (!fs.existsSync(file)) return [];
  const txt = fs.readFileSync(file, 'utf-8');
  return txt ? JSON.parse(txt) : [];
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export const Store = {
  getAll(key) { return readJson(paths[key]); },
  setAll(key, list) { writeJson(paths[key], list); },
  ensure() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    for (const k of Object.keys(paths)) {
      if (!fs.existsSync(paths[k])) writeJson(paths[k], []);
    }
  }
};

Store.ensure();
