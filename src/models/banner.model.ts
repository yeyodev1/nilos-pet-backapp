import mongoose, { Schema } from "mongoose";

export interface IBanner {
  title: string;
  link: string;
  image: { url: string; publicId: string };
  createdAt?: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, default: "", trim: true },
    link: { type: String, default: "", trim: true },
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
  },
  { timestamps: true },
);

export const Banner = mongoose.models.Banner || mongoose.model<IBanner>("Banner", bannerSchema);
