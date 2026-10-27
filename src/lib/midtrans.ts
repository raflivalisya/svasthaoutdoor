import "server-only";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
const apiBase = isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

export function getMidtransServerKey() {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  return key;
}

export function midtransAuthorization() {
  return `Basic ${Buffer.from(`${getMidtransServerKey()}:`).toString("base64")}`;
}

export function midtransApiUrl(path: string) {
  return `${apiBase}${path}`;
}
