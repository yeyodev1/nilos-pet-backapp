import mongoose, { Schema } from "mongoose";

export interface IExamResult {
  /** Cédula del dueño: es la llave con la que consulta sus resultados. */
  documentId: string;
  petName: string;
  title: string;
  date: Date;
  fileUrl: string;
  filePublicId: string;
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const examResultSchema = new Schema<IExamResult>(
  {
    documentId: { type: String, required: true, index: true, trim: true },
    petName: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    fileUrl: { type: String, required: true },
    filePublicId: { type: String, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export const ExamResult =
  mongoose.models.ExamResult || mongoose.model<IExamResult>("ExamResult", examResultSchema);
