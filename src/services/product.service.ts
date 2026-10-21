import { CustomError } from "../errors/customError.error";
import { Category } from "../models/category.model";
import { Product, PRODUCT_TYPES, ProductType } from "../models/product.model";
import { deleteImage, uploadBuffer } from "./cloudinary.service";
import { slugify } from "../utils/slugify";

const PAGE_SIZE = 24;
const IMAGES_FOLDER = "nilos-pet/productos";

/** Escapa los metacaracteres para usar texto del usuario dentro de un RegExp. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function paginate(page: number, total: number, limit: number) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return { skip: (page - 1) * limit, pages };
}

export interface PublicListFilters {
  search?: string;
  category?: string;
  type?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

/** Catálogo público: solo lo publicado. */
export async function listPublic(filters: PublicListFilters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || PAGE_SIZE));

  const query: Record<string, unknown> = { isPublished: true };

  if (filters.search) {
    query.name = { $regex: escapeRegex(String(filters.search).trim()), $options: "i" };
  }
  if (filters.category) {
    const category = await Category.findOne({ slug: String(filters.category) });
    // Categoría inexistente: catálogo vacío, no un error — el filtro viene de la URL.
    if (!category) return { items: [], total: 0, page, pages: 1 };
    query.category = category._id;
  }
  if (filters.type && PRODUCT_TYPES.includes(filters.type as ProductType)) {
    query.type = filters.type;
  }
  if (filters.featured) query.isFeatured = true;

  const total = await Product.countDocuments(query);
  const { skip, pages } = paginate(page, total, limit);
  const items = await Product.find(query)
    .populate("category", "name slug")
    .sort({ isFeatured: -1, name: 1 })
    .skip(skip)
    .limit(limit);

  return { items, total, page, pages };
}

export async function getBySlug(slug: string) {
  const product = await Product.findOne({ slug, isPublished: true }).populate(
    "category",
    "name slug",
  );
  if (!product) throw new CustomError("Producto no encontrado", 404);
  return product;
}

export interface AdminListFilters {
  search?: string;
  category?: string;
  type?: string;
  published?: string;
  priced?: string;
  page?: number;
  limit?: number;
}

/** Admin: catálogo completo, publicado o no. */
export async function listAdmin(filters: AdminListFilters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(filters.limit) || PAGE_SIZE));

  const query: Record<string, unknown> = {};

  if (filters.search) {
    const regex = { $regex: escapeRegex(String(filters.search).trim()), $options: "i" };
    query.$or = [{ name: regex }, { code: regex }];
  }
  if (filters.category) {
    const category = await Category.findOne({ slug: String(filters.category) });
    if (!category) return { items: [], total: 0, page, pages: 1 };
    query.category = category._id;
  }
  if (filters.type && PRODUCT_TYPES.includes(filters.type as ProductType)) {
    query.type = filters.type;
  }
  // El panel manda "1"/"0" y la spec decía "true"/"false": se aceptan ambos.
  if (filters.published === "true" || filters.published === "1") query.isPublished = true;
  if (filters.published === "false" || filters.published === "0") query.isPublished = false;
  if (filters.priced === "true" || filters.priced === "1") query.price = { $gt: 0 };
  if (filters.priced === "false" || filters.priced === "0") query.price = { $lte: 0 };

  const total = await Product.countDocuments(query);
  const { skip, pages } = paginate(page, total, limit);
  const items = await Product.find(query)
    .populate("category", "name slug")
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  return { items, total, page, pages };
}

export async function getById(id: string) {
  const product = await Product.findById(id).populate("category", "name slug");
  if (!product) throw new CustomError("Producto no encontrado", 404);
  return product;
}

interface ProductInput {
  code?: string;
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  type?: string;
  category?: string | null;
  isPublished?: boolean;
  isFeatured?: boolean;
  bookable?: boolean;
}

async function resolveCategory(categoryId: string | null | undefined) {
  if (!categoryId) return null;
  const category = await Category.findById(categoryId);
  if (!category) throw new CustomError("La categoría indicada no existe", 400);
  return category._id;
}

function parsePrice(price: unknown): number {
  const value = Number(price);
  if (!Number.isInteger(value) || value < 0) {
    throw new CustomError("El precio debe ser un entero en centavos, mayor o igual a 0", 400);
  }
  return value;
}

export async function create(input: ProductInput) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new CustomError("El nombre del producto es obligatorio", 400);

  const type =
    input.type && PRODUCT_TYPES.includes(input.type as ProductType)
      ? (input.type as ProductType)
      : "physical";

  const slug = slugify(String(input.slug ?? "").trim() || name);
  const clash = await Product.findOne({ slug });
  if (clash) throw new CustomError("Ya existe un producto con ese slug", 409);

  return Product.create({
    code: String(input.code ?? "").trim(),
    name,
    slug,
    description: String(input.description ?? ""),
    price: input.price !== undefined ? parsePrice(input.price) : 0,
    type,
    category: await resolveCategory(input.category),
    isPublished: Boolean(input.isPublished),
    isFeatured: Boolean(input.isFeatured),
    bookable: Boolean(input.bookable),
  });
}

export async function update(id: string, input: ProductInput) {
  const product = await Product.findById(id);
  if (!product) throw new CustomError("Producto no encontrado", 404);

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw new CustomError("El nombre del producto no puede quedar vacío", 400);
    product.name = name;
  }
  if (input.slug !== undefined) {
    const slug = slugify(String(input.slug).trim());
    if (!slug) throw new CustomError("El slug no puede quedar vacío", 400);
    const clash = await Product.findOne({ slug, _id: { $ne: product._id } });
    if (clash) throw new CustomError("Ya existe otro producto con ese slug", 409);
    product.slug = slug;
  }
  if (input.code !== undefined) product.code = String(input.code).trim();
  if (input.description !== undefined) product.description = String(input.description);
  if (input.price !== undefined) product.price = parsePrice(input.price);
  if (input.type !== undefined) {
    if (!PRODUCT_TYPES.includes(input.type as ProductType)) {
      throw new CustomError("Tipo de producto inválido", 400);
    }
    product.type = input.type;
  }
  if (input.category !== undefined) product.category = await resolveCategory(input.category);
  if (input.isPublished !== undefined) product.isPublished = Boolean(input.isPublished);
  if (input.isFeatured !== undefined) product.isFeatured = Boolean(input.isFeatured);
  if (input.bookable !== undefined) product.bookable = Boolean(input.bookable);

  await product.save();
  return product.populate("category", "name slug");
}

export async function remove(id: string) {
  const product = await Product.findById(id);
  if (!product) throw new CustomError("Producto no encontrado", 404);

  // Limpieza en Cloudinary de mejor esfuerzo: si falla, no bloquea el borrado.
  for (const image of product.images) {
    try {
      await deleteImage(image.publicId);
    } catch (error) {
      console.error(`[product] no se pudo borrar la imagen ${image.publicId}:`, error);
    }
  }
  await product.deleteOne();
}

export async function addImage(id: string, buffer: Buffer) {
  const product = await Product.findById(id);
  if (!product) throw new CustomError("Producto no encontrado", 404);

  const image = await uploadBuffer(buffer, IMAGES_FOLDER);
  product.images.push(image);
  await product.save();
  return product;
}

export async function removeImage(id: string, publicId: string) {
  const product = await Product.findById(id);
  if (!product) throw new CustomError("Producto no encontrado", 404);

  const image = product.images.find(
    (candidate: { publicId: string }) => candidate.publicId === publicId,
  );
  if (!image) throw new CustomError("La imagen no pertenece a este producto", 404);

  await deleteImage(publicId);
  product.images = product.images.filter(
    (candidate: { publicId: string }) => candidate.publicId !== publicId,
  );
  await product.save();
  return product;
}
