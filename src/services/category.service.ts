import { CustomError } from "../errors/customError.error";
import { Category } from "../models/category.model";
import { Product } from "../models/product.model";
import { slugify } from "../utils/slugify";

/** Listado público y de admin: pocas categorías, no hace falta paginar. */
export async function list() {
  return Category.find().sort({ order: 1, name: 1 });
}

export async function create(input: { name?: string; order?: number }) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new CustomError("El nombre de la categoría es obligatorio", 400);

  const slug = slugify(name);
  const existing = await Category.findOne({ slug });
  if (existing) throw new CustomError("Ya existe una categoría con ese nombre", 409);

  return Category.create({ name, slug, order: Number(input.order ?? 0) || 0 });
}

export async function update(id: string, input: { name?: string; order?: number }) {
  const category = await Category.findById(id);
  if (!category) throw new CustomError("Categoría no encontrada", 404);

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw new CustomError("El nombre de la categoría no puede quedar vacío", 400);
    const slug = slugify(name);
    const clash = await Category.findOne({ slug, _id: { $ne: category._id } });
    if (clash) throw new CustomError("Ya existe otra categoría con ese nombre", 409);
    category.name = name;
    category.slug = slug;
  }
  if (input.order !== undefined) category.order = Number(input.order) || 0;

  await category.save();
  return category;
}

export async function remove(id: string) {
  const category = await Category.findById(id);
  if (!category) throw new CustomError("Categoría no encontrada", 404);

  // Los productos no se borran: quedan sin categoría para que el admin los reubique.
  await Product.updateMany({ category: category._id }, { $set: { category: null } });
  await category.deleteOne();
}
