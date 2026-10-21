import { CustomError } from "../errors/customError.error";
import { Branch } from "../models/branch.model";

/** Público: solo sucursales activas. */
export async function listActive() {
  return Branch.find({ isActive: true }).sort({ name: 1 });
}

/** Admin: todas, incluidas las inactivas. */
export async function list() {
  return Branch.find().sort({ name: 1 });
}

export async function create(input: {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  mapsUrl?: string;
  isActive?: boolean;
}) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new CustomError("El nombre de la sucursal es obligatorio", 400);

  return Branch.create({
    name,
    address: String(input.address ?? ""),
    city: String(input.city ?? ""),
    phone: String(input.phone ?? ""),
    mapsUrl: String(input.mapsUrl ?? ""),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
  });
}

export async function update(
  id: string,
  input: {
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    mapsUrl?: string;
    isActive?: boolean;
  },
) {
  const branch = await Branch.findById(id);
  if (!branch) throw new CustomError("Sucursal no encontrada", 404);

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw new CustomError("El nombre de la sucursal no puede quedar vacío", 400);
    branch.name = name;
  }
  if (input.address !== undefined) branch.address = String(input.address);
  if (input.city !== undefined) branch.city = String(input.city);
  if (input.phone !== undefined) branch.phone = String(input.phone);
  if (input.mapsUrl !== undefined) branch.mapsUrl = String(input.mapsUrl);
  if (input.isActive !== undefined) branch.isActive = Boolean(input.isActive);

  await branch.save();
  return branch;
}

export async function remove(id: string) {
  const branch = await Branch.findById(id);
  if (!branch) throw new CustomError("Sucursal no encontrada", 404);
  // Borrarla rompería órdenes y reservas históricas: se desactiva en su lugar.
  branch.isActive = false;
  await branch.save();
  return branch;
}
