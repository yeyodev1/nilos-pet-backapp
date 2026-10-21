import mongoose, { Schema } from "mongoose";

export interface IBranch {
  name: string;
  address: string;
  city: string;
  phone: string;
  mapsUrl: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    phone: { type: String, default: "" },
    mapsUrl: { type: String, default: "" },
    // Una sucursal inactiva no acepta reservas ni retiros, pero conserva su historial.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Branch = mongoose.models.Branch || mongoose.model<IBranch>("Branch", branchSchema);
