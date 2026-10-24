import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getRazorpay, getSupabase } from "@/lib/server";
export const runtime = "nodejs";
const PACKAGES = { single: { name: "Single Ride", riders: 1, amount: 15000 }, duo: { name: "Duo Ride", riders: 2, amount: 28000 }, triple: { name: "Triple Thrill", riders: 3, amount: 42000 }, five: { name: "Fearless Five", riders: 5, amount: 65000 } } as const;
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin"), site = process.env.NEXT_PUBLIC_SITE_URL;
    if (origin && site && new URL(origin).origin !== new URL(site).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const body = await request.json();
    const buyerName = clean(body.buyerName, 100), email = clean(body.email, 254).toLowerCase(), mobile = clean(body.mobile, 18);
    const key = body.package as keyof typeof PACKAGES, pack = PACKAGES[key];
    if (!pack) return NextResponse.json({ error: "Choose a valid ticket package." }, { status: 400 });
    if (buyerName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9 ()-]{8,18}$/.test(mobile)) return NextResponse.json({ error: "Enter valid buyer name, email and mobile number." }, { status: 400 });
    if (!Array.isArray(body.riders) || body.riders.length !== pack.riders) return NextResponse.json({ error: pack.name + " requires exactly " + pack.riders + " rider(s)." }, { status: 400 });
    const riders = body.riders.map((r: any) => ({ name: clean(r?.name, 100), course: clean(r?.course, 100) }));
    if (riders.some((r: any) => r.name.length < 2 || r.course.length < 2)) return NextResponse.json({ error: "Enter a name and course/department for every rider." }, { status: 400 });
    const { client, key_id } = getRazorpay(), supabase = getSupabase(), bookingId = randomUUID();
    const order = await client.orders.create({ amount: pack.amount, currency: "INR", receipt: "bullride_" + bookingId.replace(/-/g, "").slice(0, 20), notes: { booking_id: bookingId, package: key } });
    const { error } = await supabase.from("bookings").insert({ id: bookingId, buyer_name: buyerName, email, mobile, package_name: pack.name, rider_count: pack.riders, amount_paise: pack.amount, currency: "INR", status: "pending", razorpay_order_id: order.id, riders });
    if (error) { console.error("Booking insert failed", error); return NextResponse.json({ error: "We could not save your booking. Please try again." }, { status: 500 }); }
    return NextResponse.json({ bookingId, orderId: order.id, amount: order.amount, currency: order.currency, keyId: key_id });
  } catch (e) {
    console.error("Create order failed", e);
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json({ error: msg.includes("not configured") ? msg : "Unable to start checkout. Please try again." }, { status: msg.includes("not configured") ? 503 : 500 });
  }
}
