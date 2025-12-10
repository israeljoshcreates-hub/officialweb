import mongoose from 'mongoose'

const DiscountSchema = new mongoose.Schema({
  type: { type: String, enum: ['percent','amount'], required: true },
  value: { type: Number, required: true },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  category: { type: String },
  active: { type: Boolean, default: true },
  startsAt: { type: Date },
  endsAt: { type: Date }
}, { timestamps: true })

export default mongoose.model('Discount', DiscountSchema)
