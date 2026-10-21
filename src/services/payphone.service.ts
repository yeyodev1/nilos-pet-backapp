import axios from "axios";
import { env } from "../config/env";
import { CustomError } from "../errors/customError.error";

const CONFIRM_URL = "https://paymentbox.payphonetodoesposible.com/api/confirm";

/** Códigos de estado de Payphone: 3 = Approved, 2 = Canceled. */
export const PAYPHONE_APPROVED = 3;
export const PAYPHONE_CANCELED = 2;

export interface PayphoneConfirmation {
  statusCode: number;
  transactionStatus?: string;
  amount?: number;
  clientTransactionId?: string;
  [key: string]: unknown;
}

/**
 * Confirma una transacción de la Cajita contra Payphone.
 * Hay que llamarla apenas Payphone redirige: si no se confirma en los
 * primeros 5 minutos, Payphone reversa el cobro automáticamente.
 */
export async function confirmPayment(
  id: number | string,
  clientTransactionId: string,
): Promise<PayphoneConfirmation> {
  if (!env.PAYPHONE_TOKEN) {
    throw new CustomError("Payphone no está configurado en el servidor", 503);
  }

  try {
    const { data } = await axios.post<PayphoneConfirmation>(
      CONFIRM_URL,
      { id: Number(id), clientTxId: clientTransactionId },
      { headers: { Authorization: `Bearer ${env.PAYPHONE_TOKEN}` } },
    );
    return data;
  } catch (error) {
    // Un rechazo de Payphone llega como { message, errorCode } en el body del error.
    const detalle =
      axios.isAxiosError(error) && error.response?.data
        ? error.response.data
        : undefined;
    console.error("[payphone] confirmación fallida:", detalle ?? error);
    throw new CustomError("No se pudo confirmar el pago con Payphone", 502, detalle);
  }
}
