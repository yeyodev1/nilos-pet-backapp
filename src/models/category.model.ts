import mongoose, { Schema } from "mongoose";

export interface ICategory {
  name: string;
  slug: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    // order permite al admin controlar en qué posición sale cada categoría en la tienda.
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Category =
  mongoose.models.Category || mongoose.model<ICategory>("Category", categorySchema);
