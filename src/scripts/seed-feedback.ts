/**
 * Carga lo que el cliente envió en Comentarios_PaginaWeb (nov 2026): servicios
 * con precio y descripción, categorías de servicios y exámenes, y los datos
 * reales de las dos sucursales.
 * Uso: pnpm seed:feedback
 *
 * Idempotente. Los textos y precios del documento sí se reescriben en cada
 * corrida; las imágenes solo se suben si el servicio todavía no tiene una.
 */
import "dotenv/config";
import path from "path";
import mongoose from "mongoose";
import { env } from "../config/env";
import { Branch } from "../models/branch.model";
import { Category } from "../models/category.model";
import { Product } from "../models/product.model";
import { uploadImage } from "../services/cloudinary.service";
import { slugify } from "../utils/slugify";

const SPA = "Estética y Spa";
const MED = "Medicina y Prevención";
const CARE = "Urgencias y Cuidados";
const RAPID = "Pruebas rápidas";
const BLOOD = "Exámenes de sangre";
const IMAGING = "Imágenes";

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=75`;
// Fotos de referencia del HTML que envió el cliente: se reemplazan desde el panel.
const IMG = {
  spaCanino: path.join(__dirname, "../data/img/spa-canino.jpg"),
  groom: unsplash("1516734212186-a967f81ad0d7"),
  cat: unsplash("1514888286974-6c03e2ca1dba"),
  corgi: unsplash("1537151608828-ea2b11777ee8"),
  reading: unsplash("1535930891776-0c2dfb7fda1a"),
  frenchie: unsplash("1583337130417-3346a1be7dee"),
  surgery: unsplash("1579684385127-1ef15d508118"),
  beagle: unsplash("1543466835-00a7907e9de1"),
  puppy: unsplash("1541599540903-216a46ca1dc0"),
  vetCat: unsplash("1628009368231-7bb7cfcb0def"),
  clinic: unsplash("1629909613654-28e377c37b09"),
};

interface Service {
  name: string;
  category: string;
  /** Dólares. 0 = sin precio publicado. */
  price?: number;
  priceFrom?: boolean;
  payOnline?: boolean;
  bookable?: boolean;
  dateRange?: boolean;
  image?: string;
  description: string;
}

const VACUNA =
  "Escudo protector indispensable contra enfermedades virales graves, para mantener a tu compañero fuerte y protegido.";
const PET_ID =
  "El microchip es un dispositivo del tamaño de un grano de arroz con un número de identificación único que acompaña a tu mascota toda su vida. Importante: NO es GPS ni sirve para rastrear en tiempo real por el celular.";

const SERVICES: Service[] = [
  {
    name: "Spa Canino",
    category: SPA,
    price: 15,
    priceFrom: true,
    image: IMG.spaCanino,
    description:
      "Consiente a tu buen amigo de 4 patitas con un baño relajante especializado, corte de estilo según su raza, limpieza profunda de oídos, corte-limado de uñas y un exquisito toque de perfume. Utilizamos productos dermatológicamente probados para cuidar su piel y pelaje.\n*El precio depende del peso, tamaño y tipo de manto.",
  },
  {
    name: "Spa Felino",
    category: SPA,
    price: 20,
    priceFrom: true,
    image: IMG.cat,
    description:
      "Diseñado especialmente para los reyes del hogar en un ambiente libre de estrés y con manejo cuidadoso especializado en gatos. Cuidamos su delicada piel y pelaje con total paciencia y amor.\n*El precio depende del peso, tamaño y tipo de manto.",
  },
  {
    name: "Corte de uña y limado",
    category: SPA,
    price: 5,
    image: IMG.frenchie,
    description:
      "Mantenimiento seguro y preciso de las uñas de tu mascota con herramientas profesionales y limado suave, evitando molestias al caminar o malas posturas.",
  },
  {
    name: "Servicio de desanudado",
    category: SPA,
    price: 5,
    priceFrom: true,
    image: IMG.groom,
    description:
      "Técnica con productos especializados para desenredar mantos sin maltratar la piel de tu mascota, devolviendo la suavidad y el brillo natural a su pelaje.\n*El precio depende del tamaño y condición del pelaje.",
  },
  {
    name: "Colorimetría hasta 2 zonas",
    category: SPA,
    price: 10,
    image: IMG.corgi,
    description:
      "Dale un toque divertido y único a tu mascota con tintes creativos 100% orgánicos, seguros y formulados exclusivamente para animales, aplicados profesionalmente hasta en dos zonas específicas.",
  },
  {
    name: "Consulta General",
    category: MED,
    payOnline: false,
    image: IMG.vetCat,
    description:
      "Evaluación clínica a cargo de médicos veterinarios apasionados y especializados en el diagnóstico, tratamiento y prevención de enfermedades, garantizando la salud óptima de tu mascota.",
  },
  {
    name: "Cirugía general",
    category: CARE,
    payOnline: false,
    image: IMG.surgery,
    description:
      "Procedimientos quirúrgicos seguros bajo estrictos estándares de anestesia y monitoreo. Requiere consulta general previa para valoración: la reserva agenda esa consulta.",
  },
  {
    name: "Hospitalización",
    category: CARE,
    payOnline: false,
    bookable: false,
    image: IMG.clinic,
    description:
      "Área especializada con monitoreo médico continuo y soporte intensivo de emergencias para garantizar la pronta recuperación de tu mascota en un entorno cálido y vigilado.",
  },
  {
    name: "Desparasitación Interna",
    category: MED,
    price: 5,
    priceFrom: true,
    image: IMG.beagle,
    description:
      "Protege el sistema digestivo de tu mascota contra parásitos internos mediante medicación efectiva y segura.\n*El precio es acorde al peso de la mascota.",
  },
  { name: "Vacunación Séxtuple", category: MED, price: 15, image: IMG.puppy, description: VACUNA },
  {
    name: "Vacunación Antirrábica",
    category: MED,
    price: 15,
    image: IMG.beagle,
    description: VACUNA,
  },
  {
    name: "Vacunación Tos Perrera",
    category: MED,
    price: 15,
    image: IMG.corgi,
    description: VACUNA,
  },
  {
    name: "Vacunación Triple Felina",
    category: MED,
    price: 15,
    image: IMG.cat,
    description: VACUNA,
  },
  {
    name: "Vacunación Leucemia Felina",
    category: MED,
    price: 18,
    image: IMG.vetCat,
    description: VACUNA,
  },
  {
    name: "Certificado de Salud",
    category: MED,
    price: 50,
    image: IMG.reading,
    description:
      "Trámites para salida de mascotas del país por parte de médica veterinaria registrada ante Agrocalidad.",
  },
  {
    name: "Implantación de Microchip",
    category: MED,
    price: 15,
    image: IMG.beagle,
    description:
      "Sistema de identificación subcutánea permanente y seguro para la seguridad e identificación de su mascota.",
  },
  {
    name: "Kit Pet ID Básico",
    category: MED,
    price: 25,
    image: IMG.frenchie,
    description: `Incluye cédula de la mascota, placa inteligente QR y perfil digital.\n${PET_ID}`,
  },
  {
    name: "Kit Pet ID Plus",
    category: MED,
    price: 45,
    image: IMG.frenchie,
    description: `Incluye cédula de la mascota, placa inteligente QR, perfil digital, microchip (con implantación), certificado de implantación y registro de microchip.\n${PET_ID}`,
  },
  {
    name: "Eutanasia",
    category: CARE,
    price: 75,
    image: IMG.puppy,
    description:
      "Un acto de amor y compasión infinita. Brindamos un espacio sumamente respetuoso, digno y profesional en momentos difíciles para evitar el sufrimiento innecesario de tu fiel compañero frente a enfermedades incurables.",
  },
  {
    name: "Servicio de Cremación",
    category: CARE,
    payOnline: false,
    bookable: false,
    description:
      "Servicio exequial con el más alto respeto para honrar la memoria de tu mascota. Depende del tipo, tamaño y plan elegido. Selecciona la localidad para recibir asesoría personalizada.",
  },
  {
    name: "Sueroterapia",
    category: CARE,
    price: 35,
    image: IMG.clinic,
    description:
      "Terapia de hidratación, administración intravenosa de electrolitos y medicamentos de soporte vital para una pronta recuperación.",
  },
  {
    name: "Ecografía",
    category: MED,
    price: 45,
    image: IMG.clinic,
    description:
      "Diagnóstico por ultrasonido de alta resolución para la evaluación zoométrica y en tiempo real de órganos internos. Técnica no invasiva, indolora y precisa para detectar patologías de forma temprana y definir el tratamiento óptimo.",
  },
  {
    name: "Lavado Ótico",
    category: MED,
    price: 25,
    image: IMG.groom,
    description: "Limpieza profunda con instilación de soluciones adecuadas dentro del oído.",
  },
  {
    name: "Hospedaje familiar",
    category: CARE,
    price: 15,
    priceFrom: true,
    dateRange: true,
    image: IMG.puppy,
    description:
      "Tus mascotas como en casa, libres de jaulas, en un segundo hogar seguro y amoroso mientras te ausentas. Brindamos un ambiente cálido con supervisión constante y atención personalizada.\n*El valor es por noche y por cada mascota (aplica costo adicional por alimentación casera opcional).\nRequisitos previos: vacunas y desparasitaciones al día; croquetas o alimento preparado que usualmente come; su camita, plato de comida y agua para que no se le haga extraño quedarse.",
  },
];

// Lista de muestra tomada del Examenes.html del cliente: sin precio hasta que la confirme.
const EXAMS: { name: string; category: string }[] = [
  { name: "Test rápido Enfermedad Viral Felina", category: RAPID },
  { name: "Hemograma completo", category: BLOOD },
  { name: "Urea", category: BLOOD },
  { name: "Creatinina", category: BLOOD },
  { name: "Glucosa", category: BLOOD },
  { name: "GOT / AST", category: BLOOD },
  { name: "GPT / ALT", category: BLOOD },
  { name: "Fosfatasa Alcalina", category: BLOOD },
];

// Placeholders del primer seed, reemplazados por los servicios de arriba.
const RETIRED = ["consulta-medica-general", "peluqueria-y-bano", "vacunacion", "desparasitacion"];
// Placeholders que en realidad son exámenes.
const RECLASSIFY = [
  { slug: "examen-de-sangre-completo", category: BLOOD },
  { slug: "radiografia", category: IMAGING },
];

const BRANCHES = [
  {
    placeholder: "Sucursal 1",
    name: "Mucho Lote 1 (Matriz)",
    address: "Mucho Lote 1, 4⁰ Callejón 23A N-O (cerca del Mall del Norte, pasando Urvaseo)",
    phone: "+593 997357977",
    mapsUrl: "https://maps.app.goo.gl/hkxt7Ra9kA2TbCTQ8",
    coords: "-2.0969818,-79.9157188",
    hours: "Lunes a sábado 08:30 – 18:30 · Domingos 09:00 – 15:30",
  },
  {
    placeholder: "Sucursal 2",
    name: "Urdesa Central",
    address:
      "Av. Las Monjas y Circunvalación Sur 603-PA10 (primer piso, arriba de Farmacia Medicity, esquina, frente al Banco Bolivariano; parqueo privado por la calle Circunvalación Sur)",
    phone: "+593 967576962",
    mapsUrl: "https://maps.app.goo.gl/yYX5viYVBMznBqrz5",
    coords: "-2.1708506,-79.9114026",
    hours: "Lunes a sábado 09:00 – 18:30 · Domingos bajo previa cita",
  },
];

async function main() {
  await mongoose.connect(env.DB_URI);

  const categoryId = new Map<string, mongoose.Types.ObjectId>();
  for (const [index, name] of [SPA, MED, CARE, RAPID, BLOOD, IMAGING].entries()) {
    const slug = slugify(name);
    const category = await Category.findOneAndUpdate(
      { slug },
      { $set: { name }, $setOnInsert: { slug, order: 100 + index } },
      { new: true, upsert: true },
    );
    categoryId.set(name, category._id);
  }

  const uploaded = new Map<string, { url: string; publicId: string }>();
  for (const service of SERVICES) {
    const slug = slugify(service.name);
    const product = await Product.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: service.name,
          description: service.description,
          type: "service",
          category: categoryId.get(service.category),
          price: Math.round((service.price ?? 0) * 100),
          priceFrom: Boolean(service.priceFrom),
          payOnline: service.payOnline ?? !service.priceFrom,
          bookable: service.bookable ?? true,
          dateRange: Boolean(service.dateRange),
          isPublished: true,
        },
        $setOnInsert: { slug },
      },
      { new: true, upsert: true },
    );
    if (service.image && product.images.length === 0) {
      if (!uploaded.has(service.image)) {
        uploaded.set(service.image, await uploadImage(service.image, "nilos-pet/servicios"));
      }
      product.images.push(uploaded.get(service.image));
      await product.save();
    }
  }

  for (const exam of EXAMS) {
    const slug = slugify(exam.name);
    await Product.findOneAndUpdate(
      { slug },
      {
        $set: { type: "exam", category: categoryId.get(exam.category), bookable: true },
        $setOnInsert: { slug, name: exam.name, price: 0, isPublished: true },
      },
      { upsert: true },
    );
  }
  for (const item of RECLASSIFY) {
    await Product.updateOne(
      { slug: item.slug },
      {
        $set: {
          type: "exam",
          category: categoryId.get(item.category),
          bookable: true,
          isPublished: true,
        },
      },
    );
  }
  const retired = await Product.updateMany(
    { slug: { $in: RETIRED } },
    { $set: { isPublished: false } },
  );

  for (const { placeholder, ...data } of BRANCHES) {
    const existing = await Branch.findOne({ name: { $in: [data.name, placeholder] } });
    if (existing) await Branch.updateOne({ _id: existing._id }, { $set: data });
    else await Branch.create({ ...data, isActive: true });
    await Branch.updateOne({ name: data.name }, { $set: { city: "Guayaquil", isActive: true } });
  }

  console.log(`✔ ${SERVICES.length} servicios · ${EXAMS.length} exámenes de muestra`);
  console.log(
    `✔ ${uploaded.size} imágenes subidas · ${retired.modifiedCount} placeholders ocultados`,
  );
  console.log(
    `✔ Sucursales: ${(await Branch.find({ isActive: true })).map((b) => b.name).join(" | ")}`,
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("✖ Falló el seed:", error);
  process.exit(1);
});
