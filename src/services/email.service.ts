import { Resend } from "resend";
import { env } from "../config/env";

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

/**
 * Envía un correo. Nunca lanza: el fallo de un correo no debe romper el
 * flujo que lo disparó (una compra, un registro). Devuelve si Resend lo aceptó.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY no definida — no se envió "${subject}" a ${to}`);
    return false;
  }

  try {
    const { error } = await client.emails.send({ from: env.RESEND_FROM_EMAIL, to, subject, html });
    if (error) {
      console.error("[email] Resend rechazó el envío:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed:", error);
    return false;
  }
}

/** Formatea centavos como dólares: 1990 → "$19.90". */
function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Correo de compra confirmada. Recibe la orden ya pagada; si algún ítem tiene
 * fecha agendada se muestra, porque es la cita que el cliente reservó.
 */
export async function sendOrderConfirmation(order: {
  number: number;
  total: number;
  customer: { name: string; email: string };
  items: { name: string; price: number; qty: number; scheduledFor?: Date | null }[];
}): Promise<boolean> {
  if (!order.customer?.email) return false;

  const rows = order.items
    .map((item) => {
      const cita = item.scheduledFor
        ? `<br/><span style="color:#71717a;font-size:12px">Cita: ${new Date(item.scheduledFor).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" })}</span>`
        : "";
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7">${item.name} × ${item.qty}${cita}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;text-align:right">${money(item.price * item.qty)}</td>
      </tr>`;
    })
    .join("");

  const body = `
    <p>Hola ${order.customer.name || ""},</p>
    <p>Recibimos tu pago. Este es el detalle de tu compra <strong>#${order.number}</strong>:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
      ${rows}
      <tr><td style="padding:12px 0;font-weight:bold">Total</td>
      <td style="padding:12px 0;font-weight:bold;text-align:right">${money(order.total)}</td></tr>
    </table>
    <p>Si compraste un servicio, te esperamos en la sucursal elegida. ¡Gracias por confiar en Nilos Pet!</p>`;

  return sendEmail(
    order.customer.email,
    `Compra confirmada #${order.number} — Nilos Pet`,
    layout("¡Gracias por tu compra!", body),
  );
}

/** Plantilla base: tarjeta blanca centrada con encabezado de marca. */
export function layout(title: string, body: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#111;color:#fff;padding:20px 32px;font-size:18px;font-weight:bold">Nilos Pet</td></tr>
        <tr><td style="padding:32px;color:#111;font-size:15px;line-height:1.6">
          <h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:16px 32px;color:#71717a;font-size:12px">© ${new Date().getFullYear()} Nilos Pet</td></tr>
      </table>
    </td></tr>
  </table>`;
}
