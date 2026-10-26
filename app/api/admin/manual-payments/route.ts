import { NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabase } from "@/lib/server";
import { emailTickets } from "@/lib/tickets";
import { appendPaidBookingToExcel } from "@/lib/excel";
export const runtime = "nodejs";

function authorised(request: Request) {
  const expected = process.env.ADMIN_REVIEW_TOKEN;
  const supplied = request.headers.get("x-admin-token") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Admin access denied." }, { status: 401 });
  const supabase = getSupabase();
  const { data, error } = await supabase.from("bookings").select("id,buyer_name,email,mobile,package_name,rider_count,amount_paise,status,payment_reference,created_at,riders").eq("status", "pending").order("created_at", { ascending: true }).limit(200);
  if (error) return NextResponse.json({ error: "Could not load pending bookings." }, { status: 500 });
  return NextResponse.json({ bookings: data || [] });
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Admin access denied." }, { status: 401 });
  try {
    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    const paymentReference = typeof body.paymentReference === "string" ? body.paymentReference.trim().slice(0, 100) : "";
    if (!bookingId || paymentReference.length < 6) return NextResponse.json({ error: "Booking reference and UPI transaction reference/UTR are required." }, { status: 400 });
    const supabase = getSupabase();
    const { data: booking, error: readError } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (readError || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "paid") return NextResponse.json({ ok: true, message: "This booking is already confirmed." });
    if (booking.status !== "pending" || booking.payment_method !== "phonepe_upi_manual") return NextResponse.json({ error: "This booking is not awaiting manual UPI verification." }, { status: 409 });
    const riderData = Array.isArray(booking.riders) ? booking.riders : [];
    if (riderData.length !== booking.rider_count) return NextResponse.json({ error: "Rider details are incomplete." }, { status: 409 });
    const { data: existingTickets, error: ticketReadError } = await supabase.from("tickets").select("ticket_code,rider_name,rider_course").eq("booking_id", booking.id);
    if (ticketReadError) return NextResponse.json({ error: "Could not check existing tickets." }, { status: 500 });
    let tickets = existingTickets || [];
    if (tickets.length === 0) {
      tickets = riderData.map((r: { name: string; course: string }) => ({ booking_id: booking.id, ticket_code: "BR-" + randomBytes(9).toString("hex").toUpperCase(), rider_name: r.name, rider_course: r.course, status: "valid" }));
      const { error: insertError } = await supabase.from("tickets").insert(tickets);
      if (insertError) { console.error("Manual verification ticket insert failed", insertError); return NextResponse.json({ error: "Could not create tickets. No booking confirmation was sent; contact support." }, { status: 500 }); }
    }
    const paidAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase.from("bookings").update({ status: "paid", payment_reference: paymentReference, verified_at: paidAt, verified_by: "admin", paid_at: paidAt }).eq("id", booking.id).eq("status", "pending").select("*").maybeSingle();
    if (updateError || !updated) return NextResponse.json({ error: "Could not confirm booking status. Check the queue before retrying." }, { status: 409 });
    let emailStatus = "sent";
    try {
      await emailTickets(updated, tickets);
      await supabase.from("bookings").update({ email_status: "sent" }).eq("id", booking.id);
    } catch (e) {
      emailStatus = "failed";
      console.error("Manual payment ticket email failed", e);
      await supabase.from("bookings").update({ email_status: "failed" }).eq("id", booking.id);
    }
    let excelSynced = true;
    try { await appendPaidBookingToExcel({ ...updated, riders: riderData }, tickets); }
    catch (e) { excelSynced = false; console.error("Manual payment Excel sync failed", e); }
    return NextResponse.json({ ok: true, emailStatus, excelSynced, message: emailStatus === "sent" ? "Payment marked verified and ticket email sent." : "Payment verified, but email failed. Check Resend configuration and resend the ticket email." });
  } catch (e) {
    console.error("Manual payment verification failed", e);
    return NextResponse.json({ error: "Could not verify this booking." }, { status: 500 });
  }
}
