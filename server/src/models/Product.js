import mongoose from 'mongoose'

const VariantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stock: { type: Number, default: 0 }
}, { _id: false })

const SeoSchema = new mongoose.Schema({
  title: String,
  description: String
}, { _id: false })

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: String,
  price: { type: Number, default: 0 },
  popularity: { type: Number, default: 0 },
  flavors: { type: [String], default: [] },
  variants: { type: [VariantSchema], default: [] },
  imageUrl: String,
  seo: { type: SeoSchema },
}, { timestamps: true })

export default mongoose.model('Product', ProductSchema)
