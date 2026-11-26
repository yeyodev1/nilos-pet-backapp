import mongoose, { Schema, Types } from "mongoose";

export const PRODUCT_TYPES = ["physical", "service", "exam"] as const;
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
  /** Porcentaje de descuento (0-90) sobre price. */
  discount: number;
  /** El precio es un "desde": depende de peso, tamaño, etc. */
  priceFrom: boolean;
  /** Se puede cobrar en línea. Falso = solo reserva o WhatsApp. */
  payOnline: boolean;
  /** La reserva pide rango de fechas (hospedaje). */
  dateRange: boolean;
  /** Solo exámenes: subgrupo dentro de su grupo (p. ej. "Bioquímica" en Exámenes de sangre). */
  subgroup: string;
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
    discount: { type: Number, default: 0, min: 0, max: 90 },
    priceFrom: { type: Boolean, default: false },
    payOnline: { type: Boolean, default: true },
    dateRange: { type: Boolean, default: false },
    subgroup: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

productSchema.index({ name: "text" });

/** Precio que se cobra, en centavos, con el descuento aplicado. */
export function finalPrice(product: { price: number; discount?: number }): number {
  return Math.round((product.price * (100 - (product.discount || 0))) / 100);
}

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);
