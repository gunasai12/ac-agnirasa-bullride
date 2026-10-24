import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET, signature = request.headers.get("x-razorpay-signature"), raw = await request.text();
  if (!secret || !signature) return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  const expected = createHmac("sha256", secret).update(raw).digest();
  const received = Buffer.from(signature, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  return NextResponse.json({ received: true });
}
