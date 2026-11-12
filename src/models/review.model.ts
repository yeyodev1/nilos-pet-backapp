import mongoose, { Schema, Types } from "mongoose";

export interface IReview {
  user: Types.ObjectId;
  name: string;
  rating: number;
  text: string;
  createdAt?: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    // unique: una reseña por cuenta; volver a enviar la reemplaza.
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, maxlength: 600 },
  },
  { timestamps: true },
);

export const Review = mongoose.models.Review || mongoose.model<IReview>("Review", reviewSchema);
