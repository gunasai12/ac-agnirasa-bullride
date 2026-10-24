import QRCode from "qrcode";
import { Resend } from "resend";
type Ticket = { ticket_code: string; rider_name: string; rider_course: string };
type Booking = { id: string; buyer_name: string; email: string; package_name: string; amount_paise: number };
export async function emailTickets(booking: Booking, tickets: Ticket[]) {
  const apiKey = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email service is not configured.");
  const resend = new Resend(apiKey);
  const attachments = await Promise.all(tickets.map(async ticket => ({ filename: ticket.ticket_code + ".png", content: Buffer.from(await QRCode.toBuffer(JSON.stringify({ ticketCode: ticket.ticket_code }))) })));
  const rows = tickets.map(t => "<li><strong>" + escapeHtml(t.rider_name) + "</strong> — " + escapeHtml(t.rider_course) + " — Ticket <code>" + escapeHtml(t.ticket_code) + "</code></li>").join("");
  const result = await resend.emails.send({ from, to: booking.email, subject: "Your Bull Ride tickets — booking " + booking.id.slice(0,8).toUpperCase(), html: "<div style=\"font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#161616\"><h1 style=\"background:#101010;color:#ffd21a;padding:22px\">AC AGNIRASA · BULL RIDE</h1><p>Hi " + escapeHtml(booking.buyer_name) + ",</p><p>Your payment has been verified. Keep this email ready for check-in.</p><h2>" + escapeHtml(booking.package_name) + " · ₹" + (booking.amount_paise/100).toFixed(0) + "</h2><p><b>Booking reference:</b> " + escapeHtml(booking.id) + "</p><h3>Your rider tickets</h3><ul>" + rows + "</ul><p>Event: 30 October 2026, GD Goenka University, Udyami Bazaar.</p><p>Please follow the operator's safety instructions.</p></div>", attachments });
  if (result.error) throw new Error(result.error.message);
}
function escapeHtml(input: string) { return input.replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" } as Record<string,string>)[char] || char); }
