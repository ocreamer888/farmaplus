import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

function verifyHmac(body: string, signature: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;

  const digest = createHmac("sha256", secret).update(body, "utf8").digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(digest, "base64"),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  const topic = request.headers.get("X-Shopify-Topic") ?? "";
  const body = await request.text();

  console.log("[revalidate] received", { topic, signaturePresent: Boolean(signature) });

  if (!verifyHmac(body, signature)) {
    console.log("[revalidate] HMAC verification failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const handle = (payload.handle as string | undefined) ?? "";

  const profile = {};

  switch (topic) {
    case "inventory_levels/update":
    case "products/update":
      if (handle) revalidateTag(`shopify-product-${handle}`, profile);
      break;

    case "products/delete":
      if (handle) revalidateTag(`shopify-product-${handle}`, profile);
      revalidateTag("shopify-products", profile);
      break;

    case "collections/update":
    case "collections/delete":
      revalidateTag("shopify-products", profile);
      break;

    default:
      break;
  }

  return NextResponse.json({ revalidated: true });
}
