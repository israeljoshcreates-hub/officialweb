import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import Product from './models/Product.js'
import Discount from './models/Discount.js'

// Windows-safe __dirname
const __filename = decodeURI(fileURLToPath(import.meta.url))
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../data')

const productsPath = path.join(dataDir, 'products.json')
const discountsPath = path.join(dataDir, 'discounts.json')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/minimalshop'

// Read JSON safely
function readJson(fp) {
  if (!fs.existsSync(fp)) return []
  const txt = fs.readFileSync(fp, 'utf-8')
  return txt ? JSON.parse(txt) : []
}

// Insert/update products
async function upsertProducts(items) {
  for (const p of items) {
    const slug = (p.slug || p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const update = {
      name: p.name,
      slug,
      category: p.category,
      price: p.price,
      popularity: p.popularity || 0,
      flavors: p.flavors || [],
      variants: (p.variants || []).map(v => ({ name: v.name, stock: Number(v.stock || 0) })),
      imageUrl: p.imageUrl,
      seo: p.seo || {}
    }
    await Product.updateOne({ slug }, { $set: update }, { upsert: true })
  }
}

// Insert/update discounts
async function upsertDiscounts(items) {
  // Load all products to map legacy references
  const products = await Product.find({}).lean()
  const idByKey = new Map()
  const idsByCategory = new Map()
  for (const p of products) {
    const pid = p._id.toString()
    idByKey.set(pid, pid)
    if (p.slug) idByKey.set(p.slug, pid)
    if (p.sku) idByKey.set(p.sku, pid)

    const cat = p.category || ''
    if (!idsByCategory.has(cat)) idsByCategory.set(cat, [])
    idsByCategory.get(cat).push(pid)
  }

  let updated = 0
  let inferredLegacy = 0
  let inferredCategory = 0

  for (const d of items) {
    const query = {
      type: d.type,
      value: d.value,
      category: d.category || null,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null
    }

    const original = Array.isArray(d.productIds) ? d.productIds : []
    const set = new Set()

    const add = (id) => { if (id) set.add(String(id)) }

    // 1) Keep existing valid _ids
    for (const raw of original) {
      const key = String(raw)
      if (idByKey.has(key)) add(idByKey.get(key))
    }

    // Track legacy additions
    const beforeLegacyCount = set.size

    // 2) Map legacy ids/slugs/skus
    for (const raw of original) {
      const key = String(raw).replace(/[\[\]\s']/g, '')
      if (!idByKey.has(key)) {
        const id = idByKey.get(key)
        if (id) add(id)
      }
    }

    inferredLegacy += (set.size - beforeLegacyCount)

    // 3) Add products by category if not present
    const catIds = idsByCategory.get(d.category || '') || []
    const beforeCatCount = set.size
    for (const cid of catIds) add(cid)
    inferredCategory += (set.size - beforeCatCount)

    // Convert set to array of ObjectIds
    const next = Array.from(set).map(s => idByKey.get(s)).filter(Boolean)

    // Save only if changed
    const changed =
      next.length !== original.length ||
      next.some((v, i) => String(v) !== String(original[i]))

    if (changed) {
      await Discount.updateOne(query, { $set: { active: d.active !== false, productIds: next } }, { upsert: true })
      updated++
    }
  }

  console.log(`Discounts updated: ${updated}`)
  console.log(`ProductIds added from legacy references: ${inferredLegacy}`)
  console.log(`ProductIds added by category inference: ${inferredCategory}`)
}

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB connected (seed+migration)')

  const products = readJson(productsPath)
  const discounts = readJson(discountsPath)

  console.log(`Products file exists: ${fs.existsSync(productsPath)}`)
  console.log(`Discounts file exists: ${fs.existsSync(discountsPath)}`)

  await upsertProducts(products)
  await upsertDiscounts(discounts)

  console.log(`Seed+Migration completed: products=${products.length}, discounts=${discounts.length}`)

  await mongoose.disconnect()
}

main().catch(err => {
  console.error('Seed+Migration error', err)
  process.exit(1)
})
