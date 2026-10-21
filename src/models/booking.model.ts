import mongoose, { Schema, Types } from "mongoose";

export const BOOKING_STATUSES = ["pending", "confirmed", "done", "canceled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface IBookingCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface IBooking {
  product: Types.ObjectId;
  branch: Types.ObjectId;
  /** Orden que originó la reserva. Null cuando se reservó sin pago en línea. */
  order: Types.ObjectId | null;
  customer: IBookingCustomer;
  preferredAt: Date;
  status: BookingStatus;
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    customer: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    preferredAt: { type: Date, required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Booking =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", bookingSchema);
