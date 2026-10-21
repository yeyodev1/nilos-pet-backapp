import mongoose, { Schema, Types } from "mongoose";

export const PRODUCT_TYPES = ["physical", "service"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface IProduct {
  code: string;
  name: string;
  slug: string;
  description: string;
  /** Precio en centavos de dólar. 0 significa "sin precio todavía": no se puede comprar. */
  price: number;
  type: ProductType;
  category: Types.ObjectId | null;
  images: IProductImage[];
  isPublished: boolean;
  isFeatured: boolean;
  /** Solo servicios: si exige elegir sucursal y fecha al comprar. */
  bookable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const productSchema = new Schema<IProduct>(
  {
    code: { type: String, default: "", index: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, default: 0 },
    type: { type: String, enum: PRODUCT_TYPES, default: "physical" },
    category: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      default: [],
    },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    bookable: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.index({ name: "text" });

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);
