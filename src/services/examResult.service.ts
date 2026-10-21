import { Types } from "mongoose";
import { CustomError } from "../errors/customError.error";
import { ExamResult } from "../models/examResult.model";
import { deleteFile, uploadFile } from "./cloudinary.service";

const PAGE_SIZE = 20;
const FILES_FOLDER = "nilos-pet/examenes";
const CEDULA = /^\d{6,}$/;

function normalizeDocumentId(documentId: string): string {
  const value = String(documentId ?? "").trim();
  // Solo dígitos y mínimo 6: evita consultas al voleo con cadenas basura.
  if (!CEDULA.test(value)) {
    throw new CustomError("Escribe una cédula válida (solo números, mínimo 6 dígitos)", 400);
  }
  return value;
}

/** Público: el dueño consulta los resultados de sus mascotas con su cédula. */
export async function findByDocumentId(documentId: string) {
  const value = normalizeDocumentId(documentId);
  return ExamResult.find({ documentId: value }).sort({ date: -1 });
}

export async function list(filters: { documentId?: string; page?: number }) {
  const page = Math.max(1, Number(filters.page) || 1);
  const query: Record<string, unknown> = {};
  if (filters.documentId) query.documentId = String(filters.documentId).trim();

  const total = await ExamResult.countDocuments(query);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = await ExamResult.find(query)
    .sort({ date: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);

  return { items, total, page, pages };
}

export interface CreateExamResultInput {
  documentId?: string;
  petName?: string;
  title?: string;
  date?: string;
  notes?: string;
}

export async function create(input: CreateExamResultInput, fileBuffer: Buffer | undefined) {
  const documentId = normalizeDocumentId(String(input.documentId ?? ""));

  const title = String(input.title ?? "").trim();
  if (!title) throw new CustomError("El título del examen es obligatorio", 400);

  const date = input.date ? new Date(String(input.date)) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new CustomError("La fecha del examen no es válida", 400);
  }

  if (!fileBuffer) throw new CustomError("Adjunta el archivo del resultado", 400);

  // resource_type auto: los resultados suelen ser PDF, pero también llegan fotos.
  const file = await uploadFile(fileBuffer, FILES_FOLDER);

  return ExamResult.create({
    documentId,
    petName: String(input.petName ?? "").trim(),
    title,
    date,
    fileUrl: file.url,
    filePublicId: file.publicId,
    notes: String(input.notes ?? "").trim(),
  });
}

export async function remove(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new CustomError("Resultado no encontrado", 404);
  const result = await ExamResult.findById(id);
  if (!result) throw new CustomError("Resultado no encontrado", 404);

  try {
    await deleteFile(result.filePublicId);
  } catch (error) {
    console.error(`[examResult] no se pudo borrar el archivo ${result.filePublicId}:`, error);
  }
  await result.deleteOne();
}
