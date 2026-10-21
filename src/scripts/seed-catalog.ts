/**
 * Seed del catálogo — carga categorías, productos, servicios y sucursales base.
 * Uso: pnpm seed:catalog
 *
 * Idempotente: se puede correr las veces que haga falta. Lo que el admin ya
 * tocó (precio, descripción, imágenes, publicación) no se pisa: los productos
 * existentes se saltan y solo se crean los que falten.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../config/env";
import { Branch } from "../models/branch.model";
import { Category } from "../models/category.model";
import { Product } from "../models/product.model";
import { slugify } from "../utils/slugify";
import catalog from "../data/products.json";

const SERVICES_CATEGORY = "Servicios veterinarios";

const SERVICES = [
  "Consulta médica general",
  "Examen de sangre completo",
  "Radiografía",
  "Peluquería y baño",
  "Vacunación",
  "Desparasitación",
];

interface CatalogItem {
  code: string;
  name: string;
  slug: string;
  category: string;
  rawCategory: string;
  type: string;
}

async function upsertCategory(name: string, order: number) {
  const slug = slugify(name);
  const category = await Category.findOneAndUpdate(
    { slug },
    { $set: { name }, $setOnInsert: { slug, order } },
    { new: true, upsert: true },
  );
  return category;
}

async function main() {
  console.log("Conectando a MongoDB...");
  await mongoose.connect(env.DB_URI);

  // Categorías del catálogo + la de servicios.
  const categoryBySlug = new Map<string, mongoose.Types.ObjectId>();
  const categoryNames = [...catalog.categories, SERVICES_CATEGORY];
  for (const [index, name] of categoryNames.entries()) {
    const category = await upsertCategory(name, index);
    categoryBySlug.set(category.slug, category._id);
  }
  console.log(`✔ ${categoryNames.length} categorías aseguradas`);

  // Productos físicos del JSON: solo se crean los que falten.
  let created = 0;
  let skipped = 0;
  for (const item of catalog.items as CatalogItem[]) {
    const exists = await Product.exists({ slug: item.slug });
    if (exists) {
      skipped++;
      continue;
    }
    await Product.create({
      code: item.code,
      name: item.name,
      slug: item.slug,
      type: item.type === "service" ? "service" : "physical",
      category: categoryBySlug.get(slugify(item.category)) ?? null,
      price: 0,
      isPublished: false,
    });
    created++;
  }

  // Servicios reservables: nacen sin precio y sin publicar, el admin los completa.
  let servicesCreated = 0;
  const servicesCategoryId = categoryBySlug.get(slugify(SERVICES_CATEGORY)) ?? null;
  for (const name of SERVICES) {
    const slug = slugify(name);
    const exists = await Product.exists({ slug });
    if (exists) continue;
    await Product.create({
      name,
      slug,
      type: "service",
      bookable: true,
      category: servicesCategoryId,
      price: 0,
      isPublished: false,
    });
    servicesCreated++;
  }

  // Sucursales placeholder solo si la colección está vacía.
  let branchesCreated = 0;
  if ((await Branch.countDocuments()) === 0) {
    await Branch.create([
      { name: "Sucursal 1", address: "", city: "", isActive: true },
      { name: "Sucursal 2", address: "", city: "", isActive: true },
    ]);
    branchesCreated = 2;
  }

  console.log("—".repeat(40));
  console.log(`✔ Productos creados: ${created} · saltados (ya existían): ${skipped}`);
  console.log(`✔ Servicios creados: ${servicesCreated} de ${SERVICES.length}`);
  console.log(`✔ Sucursales creadas: ${branchesCreated}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("✖ Falló el seed del catálogo:", error);
  process.exit(1);
});
