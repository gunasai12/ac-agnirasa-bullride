import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { getSupabase } from "@/lib/server";
import { emailTickets } from "@/lib/tickets";
import { appendPaidBookingToExcel } from "@/lib/excel";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = await request.json();
    if (![razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId].every(v => typeof v === "string" && v.length > 0)) return NextResponse.json({ error: "Missing payment verification details." }, { status: 400 });
    const secret = process.env.RAZORPAY_KEY_SECRET, keyId = process.env.RAZORPAY_KEY_ID;
    if (!secret || !keyId) return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
    const expected = createHmac("sha256", secret).update(razorpay_order_id + "|" + razorpay_payment_id).digest(), received = Buffer.from(razorpay_signature, "hex");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return NextResponse.json({ error: "Payment signature is invalid." }, { status: 400 });
    const supabase = getSupabase();
    const { data: booking, error: readError } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (readError || !booking) return NextResponse.json({ error: "Booking was not found." }, { status: 404 });
    if (booking.razorpay_order_id !== razorpay_order_id) return NextResponse.json({ error: "Payment order does not match booking." }, { status: 400 });
    if (booking.status === "paid") return NextResponse.json({ ok: true, message: "Payment already verified." });
    const auth = Buffer.from(keyId + ":" + secret).toString("base64");
    const paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(razorpay_payment_id), { headers: { Authorization: "Basic " + auth }, cache: "no-store" });
    if (!paymentResponse.ok) return NextResponse.json({ error: "Could not verify payment with provider." }, { status: 502 });
    const payment = await paymentResponse.json();
    if (payment.order_id !== razorpay_order_id || payment.amount !== booking.amount_paise || payment.currency !== booking.currency || !["captured", "authorized"].includes(payment.status)) return NextResponse.json({ error: "Payment amount or status does not match booking." }, { status: 400 });
    const riderData = Array.isArray(booking.riders) ? booking.riders : [];
    if (riderData.length !== booking.rider_count) return NextResponse.json({ error: "Rider data is incomplete. Contact event support." }, { status: 409 });
    const tickets = riderData.map((r: {name:string;course:string}) => ({ booking_id: booking.id, ticket_code: "BR-" + randomBytes(9).toString("hex").toUpperCase(), rider_name: r.name, rider_course: r.course, status: "valid" }));
    const { error: ticketError } = await supabase.from("tickets").insert(tickets);
    if (ticketError) { console.error("Ticket insert failed", ticketError); return NextResponse.json({ error: "Payment verified but ticket generation needs support. Contact event team with booking reference." }, { status: 500 }); }
    const { error: updateError } = await supabase.from("bookings").update({ status: "paid", razorpay_payment_id, paid_at: new Date().toISOString() }).eq("id", booking.id).eq("status", "pending");
    if (updateError) { console.error("Booking status update failed", updateError); return NextResponse.json({ error: "Payment verified but booking confirmation needs support." }, { status: 500 }); }
    const { data: paidBooking } = await supabase.from("bookings").select("*").eq("id", booking.id).single();
    const emailTask = emailTickets(paidBooking || booking, tickets).then(async () => {
      await supabase.from("bookings").update({ email_status: "sent" }).eq("id", booking.id);
    }).catch(async (e) => {
      console.error("Ticket email failed", e);
      await supabase.from("bookings").update({ email_status: "failed" }).eq("id", booking.id);
    });
    const excelTask = appendPaidBookingToExcel({ ...(paidBooking || booking), riders: riderData }, tickets).then(() => true).catch((e) => {
      console.error("Excel sync failed", e);
      return false;
    });
    const [, excelSynced] = await Promise.all([emailTask, excelTask]);
    return NextResponse.json({ ok: true, excelSynced, message: "Payment verified. Your tickets are being confirmed by email." });
  } catch (e) { console.error("Verify payment failed", e); return NextResponse.json({ error: "Could not verify payment. Do not pay again; contact event support if money was deducted." }, { status: 500 }); }
}
