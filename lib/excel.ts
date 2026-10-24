type BookingForExcel = {
  id: string;
  buyer_name: string;
  email: string;
  mobile: string;
  package_name: string;
  rider_count: number;
  amount_paise: number;
  paid_at?: string | null;
  razorpay_payment_id?: string | null;
};
type TicketForExcel = { ticket_code: string; rider_name: string; rider_course: string };

/**
 * Calls a Power Automate flow which uses the Excel Online (Business) connector.
 * Keep the flow URL secret and store it only in server-side environment variables.
 * The flow should append one row per ticket to a pre-created Excel table.
 */
export async function appendPaidBookingToExcel(booking: BookingForExcel, tickets: TicketForExcel[]) {
  const flowUrl = process.env.POWER_AUTOMATE_EXCEL_WEBHOOK_URL;
  if (!flowUrl) throw new Error("Excel sync is not configured: POWER_AUTOMATE_EXCEL_WEBHOOK_URL");
  const payload = {
    bookingId: booking.id,
    paidAt: booking.paid_at || new Date().toISOString(),
    buyerName: booking.buyer_name,
    buyerEmail: booking.email,
    buyerMobile: booking.mobile,
    packageName: booking.package_name,
    amountInr: booking.amount_paise / 100,
    paymentId: booking.razorpay_payment_id || "",
    paymentStatus: "Paid",
    tickets: tickets.map((ticket) => ({
      ticketCode: ticket.ticket_code,
      riderName: ticket.rider_name,
      riderCourse: ticket.rider_course,
    })),
  };
  const response = await fetch(flowUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error("Power Automate Excel sync failed (" + response.status + "): " + body.slice(0, 500));
  }
}
