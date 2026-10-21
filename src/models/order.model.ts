import mongoose, { Schema, Types } from "mongoose";

export const ORDER_STATUSES = ["pending", "paid", "canceled", "failed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILLMENT_TYPES = ["pickup", "delivery"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export interface IOrderCustomer {
  name: string;
  email: string;
  phone: string;
  documentId: string;
}

export interface IOrderItem {
  product: Types.ObjectId;
  /** Copia del nombre y el precio al momento de comprar: el catálogo puede cambiar después. */
  name: string;
  price: number;
  qty: number;
  branch: Types.ObjectId | null;
  scheduledFor: Date | null;
}

export interface IOrder {
  number: number;
  user: Types.ObjectId | null;
  customer: IOrderCustomer;
  items: IOrderItem[];
  /** Total en centavos, calculado siempre en el servidor. */
  total: number;
  clientTransactionId: string;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  branch: Types.ObjectId | null;
  deliveryAddress: string;
  payphoneResponse: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    number: { type: Number, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customer: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      documentId: { type: String, default: "" },
    },
    items: {
      type: [
        {
          product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          name: { type: String, required: true },
          price: { type: Number, required: true },
          qty: { type: Number, required: true, min: 1 },
          branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
          scheduledFor: { type: Date, default: null },
        },
      ],
      default: [],
    },
    total: { type: Number, required: true },
    clientTransactionId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
    fulfillment: { type: String, enum: FULFILLMENT_TYPES, default: "pickup" },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    deliveryAddress: { type: String, default: "" },
    // Respuesta completa de Payphone: sirve para soporte y conciliación.
    payphoneResponse: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

export const Order = mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema);

/** Contador atómico para el número de orden visible al cliente. */
const counterSchema = new Schema(
  { key: { type: String, required: true, unique: true }, seq: { type: Number, default: 0 } },
  { versionKey: false },
);

const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export async function nextOrderNumber(): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { key: "order" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}
