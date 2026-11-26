/**
 * Fotos de servicios (generadas con IA, nov 2026), banner de ejemplo y
 * subgrupos de los exámenes de muestra.
 * Uso: pnpm seed:photos <carpeta>
 *
 * La carpeta trae <slug>.jpg por servicio y, opcional, _banner.png.
 * Cada foto reemplaza la imagen del servicio. Las anteriores no se borran de
 * Cloudinary porque varias estaban compartidas entre servicios.
 * El banner solo se crea si todavía no hay ninguno.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { env } from "../config/env";
import { Banner } from "../models/banner.model";
import { Product } from "../models/product.model";
import { uploadBuffer } from "../services/cloudinary.service";

const SUBGROUPS: Record<string, string> = {
  "hemograma-completo": "Hematología",
  "examen-de-sangre-completo": "Hematología",
  creatinina: "Bioquímica",
  urea: "Bioquímica",
  glucosa: "Bioquímica",
  "got-ast": "Bioquímica",
  "gpt-alt": "Bioquímica",
  "fosfatasa-alcalina": "Bioquímica",
};

async function main() {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(dir)) throw new Error("Pasa la carpeta con las fotos");

  await mongoose.connect(env.DB_URI);

  let photos = 0;
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".jpg"))) {
    const slug = path.basename(file, ".jpg");
    const product = await Product.findOne({ slug, type: "service" });
    if (!product) {
      console.warn(`· sin servicio para ${slug}`);
      continue;
    }
    const image = await uploadBuffer(fs.readFileSync(path.join(dir, file)), "nilos-pet/servicios");
    product.images = [image];
    await product.save();
    photos++;
  }

  const bannerFile = path.join(dir, "_banner.png");
  let banner = "ya existía";
  if (fs.existsSync(bannerFile) && (await Banner.countDocuments()) === 0) {
    const image = await uploadBuffer(fs.readFileSync(bannerFile), "nilos-pet/banners", true);
    await Banner.create({ title: "Reserva en línea", link: "/servicios", image });
    banner = "creado";
  }

  let subgroups = 0;
  for (const [slug, subgroup] of Object.entries(SUBGROUPS)) {
    const result = await Product.updateOne({ slug, type: "exam" }, { $set: { subgroup } });
    subgroups += result.modifiedCount;
  }

  console.log(`✔ ${photos} fotos · banner ${banner} · ${subgroups} subgrupos`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("✖ Falló el seed:", error);
  process.exit(1);
});
