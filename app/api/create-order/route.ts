import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabase } from "@/lib/server";
export const runtime = "nodejs";
const PACKAGES = { single: { name: "Single Ride", riders: 1, amount: 15000 }, duo: { name: "Duo Ride", riders: 2, amount: 28000 }, triple: { name: "Triple Thrill", riders: 3, amount: 42000 }, five: { name: "Fearless Five", riders: 6, amount: 75000 } } as const;
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";
function isTrustedOrigin(origin: string): boolean {
  const trusted = [process.env.NEXT_PUBLIC_SITE_URL, "https://ac-agnirasa-bullride.vercel.app"].filter((v): v is string => Boolean(v));
  try { const actual = new URL(origin).origin; return trusted.some(v => { try { return new URL(v).origin === actual; } catch { return false; } }); } catch { return false; }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !isTrustedOrigin(origin)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const body = await request.json();
    const buyerName = clean(body.buyerName, 100), email = clean(body.email, 254).toLowerCase(), mobile = clean(body.mobile, 18);
    const key = body.package as keyof typeof PACKAGES, pack = PACKAGES[key];
    if (!pack) return NextResponse.json({ error: "Choose a valid ticket package." }, { status: 400 });
    if (buyerName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9 ()-]{8,18}$/.test(mobile)) return NextResponse.json({ error: "Enter valid buyer name, email and mobile number." }, { status: 400 });
    if (!Array.isArray(body.riders) || body.riders.length !== pack.riders) return NextResponse.json({ error: pack.name + " requires exactly " + pack.riders + " rider(s)." }, { status: 400 });
    const riders = body.riders.map((r: any) => ({ name: clean(r?.name, 100), course: clean(r?.course, 100) }));
    if (riders.some((r: any) => r.name.length < 2 || r.course.length < 2)) return NextResponse.json({ error: "Enter a name and course/department for every rider." }, { status: 400 });
    const supabase = getSupabase();
    const { data: settings, error: settingsError } = await supabase.from("event_settings").select("max_tickets").eq("id", true).single();
    if (settingsError || !settings) return NextResponse.json({ error: "Ticket booking is temporarily unavailable." }, { status: 503 });
    const { data: activeBookings, error: capacityError } = await supabase.from("bookings").select("rider_count,status").in("status", ["paid", "pending"]);
    if (capacityError) return NextResponse.json({ error: "We could not check ticket availability. Please try again." }, { status: 503 });
    const allocated = (activeBookings || []).reduce((sum, b) => sum + Number(b.rider_count), 0);
    if (allocated + pack.riders > settings.max_tickets) return NextResponse.json({ error: "Sorry, this booking would exceed the event's ticket capacity." }, { status: 409 });
    const bookingId = randomUUID();
    const { error } = await supabase.from("bookings").insert({ id: bookingId, buyer_name: buyerName, email, mobile, package_name: pack.name, rider_count: pack.riders, amount_paise: pack.amount, currency: "INR", status: "pending", razorpay_order_id: null, riders, payment_method: "phonepe_upi_manual", payment_reference: null, admin_note: null, verified_at: null, verified_by: null, email_status: "pending" });
    if (error) { console.error("Booking insert failed", error); return NextResponse.json({ error: "We could not save your booking. Please try again." }, { status: 500 }); }
    return NextResponse.json({ bookingId, amountInr: pack.amount / 100, status: "pending" });
  } catch (e) {
    console.error("Create booking failed", e);
    return NextResponse.json({ error: "Unable to save booking. Please try again." }, { status: 500 });
  }
}
