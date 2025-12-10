import mongoose from 'mongoose'
import Product from './models/Product.js'
import Discount from './models/Discount.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/minimalshop'

function isValidObjectId(id){
  return mongoose.Types.ObjectId.isValid(id)
}

async function run(){
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB connected (migration)')

  // Build mapping from known identifiers to _id
  const products = await Product.find({}).lean()
  const idByKey = new Map()
  const idsByCategory = new Map()
  for (const p of products){
    const pid = p._id
    idByKey.set(String(pid), pid)
    if (p.slug) idByKey.set(String(p.slug), pid)
    if (p.sku) idByKey.set(String(p.sku), pid)
    const cat = p.category || ''
    if (!idsByCategory.has(cat)) idsByCategory.set(cat, [])
    idsByCategory.get(cat).push(pid)
  }

  const discounts = await Discount.find({})
  let updated = 0
  let inferredLegacy = 0
  let inferredCategory = 0
  for (const d of discounts){
    const original = Array.isArray(d.productIds) ? d.productIds : []
    const set = new Set()
    const add = (id) => { if (id) set.add(String(id)) }
    // Keep existing valid _ids that exist in products
    for (const raw of original){
      const key = String(raw)
      const exists = idByKey.get(key)
      if (exists) add(exists)
    }
    const beforeLegacyCount = set.size
    // Map legacy ids/slugs/skus and add
    for (const raw of original){
      const key = String(raw)
      if (!isValidObjectId(key)){
        const id = idByKey.get(key)
        if (id) add(id)
      }
    }
    inferredLegacy += (set.size - beforeLegacyCount)
    // Append category products not already present
    const catIds = idsByCategory.get(d.category || '') || []
    const beforeCatCount = set.size
    for (const cid of catIds){ add(cid) }
    inferredCategory += (set.size - beforeCatCount)

    const next = Array.from(set).map(s => idByKey.get(s))
    const changed = next.length !== original.length || next.some((v,i)=>String(v)!==String(original[i]))
    if (changed){
      d.productIds = next
      await d.save()
      updated++
    }
  }

  console.log(`Migration completed. Discounts updated: ${updated}. Inferred from legacy: ${inferredLegacy}. Inferred by category: ${inferredCategory}`)
  await mongoose.disconnect()
}

run().catch(err=>{ console.error('Migration error', err); process.exit(1) })
