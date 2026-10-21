import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { env } from "../config/env";
import { CustomError } from "../errors/customError.error";

let configured = false;

export function isCloudinaryConfigured(): boolean {
  return !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function ensureConfig() {
  if (configured) return;
  if (!isCloudinaryConfigured()) {
    throw new CustomError("Cloudinary no está configurado en el servidor", 503);
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

const DEFAULT_FOLDER = "nilos-pet-backapp";

/** Sube un buffer (multer memoryStorage). */
export function uploadBuffer(
  buffer: Buffer,
  folder = DEFAULT_FOLDER,
): Promise<{ url: string; publicId: string }> {
  ensureConfig();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", transformation: [{ quality: "auto", fetch_format: "auto" }] },
      (error, result?: UploadApiResponse) => {
        if (error || !result) return reject(error || new Error("Cloudinary sin respuesta"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/** Sube un data URI base64 o una URL remota. */
export async function uploadImage(
  source: string,
  folder = DEFAULT_FOLDER,
): Promise<{ url: string; publicId: string }> {
  ensureConfig();
  const result = await cloudinary.uploader.upload(source, {
    folder,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteImage(publicId: string): Promise<void> {
  ensureConfig();
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Sube un buffer de cualquier tipo (PDF incluido) con resource_type auto.
 * Para los resultados de exámenes, que pueden ser imagen o documento.
 */
export function uploadFile(
  buffer: Buffer,
  folder = DEFAULT_FOLDER,
): Promise<{ url: string; publicId: string }> {
  ensureConfig();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result?: UploadApiResponse) => {
        if (error || !result) return reject(error || new Error("Cloudinary sin respuesta"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Borra un archivo subido con resource_type auto. Cloudinary guarda el tipo
 * real (image o raw) y destroy exige acertarlo, así que se intentan ambos.
 */
export async function deleteFile(publicId: string): Promise<void> {
  ensureConfig();
  const asImage = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  if (asImage?.result === "ok") return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
}
