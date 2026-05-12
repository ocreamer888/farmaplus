import type { Money } from "./types";

const FALLBACK_RATE = 520;
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

let rateCache: { rate: number; fetchedAt: number } | null = null;

async function fetchFromPaginasweb(): Promise<number> {
  const res = await fetch("https://tipodecambio.paginasweb.cr/api", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("paginasweb fetch failed");
  const json = (await res.json()) as { venta: number };
  if (typeof json.venta !== "number") throw new Error("paginasweb bad shape");
  return json.venta;
}

async function fetchFromBCCR(): Promise<number> {
  const email = process.env.BCCR_EMAIL;
  const token = process.env.BCCR_TOKEN;
  if (!email || !token) throw new Error("BCCR credentials not configured");

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const url =
    `https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/` +
    `wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicos` +
    `?Indicador=318&FechaInicio=${today}&FechaFinal=${today}` +
    `&Nombre=FarmaPlus&SubNiveles=N&CorreoElectronico=${email}&Token=${token}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("BCCR fetch failed");
  const xml = await res.text();

  const match = xml.match(/<NUM_VALOR>([\d,\.]+)<\/NUM_VALOR>/);
  if (!match?.[1]) throw new Error("BCCR XML parse failed");

  const rate = parseFloat(match[1].replace(",", "."));
  if (isNaN(rate) || rate <= 0) throw new Error("BCCR invalid rate");
  return rate;
}

export async function getVentaRate(): Promise<number> {
  const now = Date.now();

  if (rateCache && now - rateCache.fetchedAt < TTL_MS) {
    return rateCache.rate;
  }

  let rate: number;

  try {
    rate = await fetchFromPaginasweb();
  } catch (err) {
    console.warn("[currency] paginasweb failed, trying BCCR:", err);
    try {
      rate = await fetchFromBCCR();
    } catch (err2) {
      console.warn("[currency] BCCR failed, using fallback rate:", err2);
      rate = FALLBACK_RATE;
    }
  }

  rateCache = { rate, fetchedAt: now };
  return rate;
}

export function formatDualPrice(
  money: Money,
  rate: number
): { crc: string; usd: string } {
  if (money.currencyCode !== "CRC") {
    throw new Error(
      `formatDualPrice: expected CRC, got ${money.currencyCode}`
    );
  }

  const crcAmount = Math.round(parseFloat(money.amount));
  const usdAmount = parseFloat(money.amount) / rate;

  // CRC: period thousands separator, ₡ prefix, zero decimals
  const crc = "₡" + crcAmount.toLocaleString("de-DE");
  // USD: comma thousands separator, $ prefix, 2 decimals
  const usd = "$" + usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return { crc, usd };
}
