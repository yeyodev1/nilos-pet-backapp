/**
 * Seed script — crea la cuenta demo de cliente desde .env.
 * Uso: pnpm seed:customer
 *
 * Si la cuenta ya existe no se toca: cambiar la contraseña desde acá
 * borraría una que se hubiera cambiado a mano.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../config/env";
import { User } from "../models/user.model";

async function main() {
  if (!env.DEMO_CUSTOMER_EMAIL || !env.DEMO_CUSTOMER_PASSWORD) {
    console.error("✖ DEMO_CUSTOMER_EMAIL o DEMO_CUSTOMER_PASSWORD no están definidas en .env");
    process.exit(1);
  }

  console.log("Conectando a MongoDB...");
  await mongoose.connect(env.DB_URI);

  const existing = await User.findOne({ email: env.DEMO_CUSTOMER_EMAIL });

  if (existing) {
    console.log(`✔ La cuenta demo ya existe: ${env.DEMO_CUSTOMER_EMAIL} (no se tocó)`);
  } else {
    await User.create({
      email: env.DEMO_CUSTOMER_EMAIL,
      password: env.DEMO_CUSTOMER_PASSWORD,
      name: "Cliente Demo",
      accountType: "customer",
    });
    console.log(`✔ Cuenta demo creada: ${env.DEMO_CUSTOMER_EMAIL}`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("✖ Falló el seed:", error);
  process.exit(1);
});
