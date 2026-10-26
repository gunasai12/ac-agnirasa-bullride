import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const bookingId = String(form.get("bookingId") || "");
    const paymentReference = String(form.get("paymentReference") || "").trim().slice(0, 100);
    const file = form.get("screenshot");
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return NextResponse.json({ error: "Invalid booking reference." }, { status: 400 });
    if (paymentReference.length < 6) return NextResponse.json({ error: "Enter your UPI transaction ID / UTR." }, { status: 400 });
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Upload a JPG, PNG or WEBP screenshot up to 5 MB." }, { status: 400 });
    const supabase = getSupabase();
    const { data: booking, error: bookingError } = await supabase.from("bookings").select("id,status,payment_method").eq("id", bookingId).maybeSingle();
    if (bookingError || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status !== "pending" || booking.payment_method !== "phonepe_upi_manual") return NextResponse.json({ error: "Booking is not awaiting payment evidence." }, { status: 409 });
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = bookingId + "/" + Date.now() + "." + ext;
    const { error: uploadError } = await supabase.storage.from("payment-screenshots").upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Screenshot upload failed", uploadError);
      return NextResponse.json({ error: "Could not store screenshot. Please try again later." }, { status: 503 });
    }
    const { error: updateError } = await supabase.from("bookings").update({ payment_reference: paymentReference, payment_screenshot_path: path }).eq("id", bookingId).eq("status", "pending");
    if (updateError) {
      await supabase.storage.from("payment-screenshots").remove([path]);
      return NextResponse.json({ error: "Could not save payment details." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: "Payment screenshot submitted; awaiting admin verification." });
  } catch (error) {
    console.error("Payment screenshot submission failed", error);
    return NextResponse.json({ error: "Could not submit screenshot." }, { status: 500 });
  }
}
