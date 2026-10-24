type BookingForExcel = {
  id: string;
  buyer_name: string;
  email: string;
  mobile: string;
  package_name: string;
  rider_count: number;
  amount_paise: number;
  created_at?: string;
  paid_at?: string | null;
  razorpay_payment_id?: string | null;
  riders?: Array<{ name: string; course: string }>;
};
type TicketForExcel = { ticket_code: string; rider_name: string; rider_course: string };

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error("Excel export is not configured: " + name);
  return value;
}

async function graphToken() {
  const tenant = requiredEnv("MS_TENANT_ID");
  const clientId = requiredEnv("MS_CLIENT_ID");
  const clientSecret = requiredEnv("MS_CLIENT_SECRET");
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Microsoft Graph token request failed: " + response.status);
  const data = await response.json();
  if (typeof data.access_token !== "string") throw new Error("Microsoft Graph did not return an access token.");
  return data.access_token as string;
}

/**
 * Appends one row per rider to an Excel table in OneDrive/SharePoint using Microsoft Graph.
 * The workbook must already contain a table with matching columns.
 *
 * Note: Excel workbook table-row APIs currently document delegated Files.ReadWrite permissions
 * rather than application permissions. This client-credentials implementation may not be accepted
 * for workbook writes in your tenant; if it fails, use a delegated/Power Automate connector flow.
 */
export async function appendPaidBookingToExcel(booking: BookingForExcel, tickets: TicketForExcel[]) {
  const driveId = requiredEnv("MS_EXCEL_DRIVE_ID");
  const itemId = requiredEnv("MS_EXCEL_WORKBOOK_ITEM_ID");
  const tableName = process.env.MS_EXCEL_TABLE_NAME || "Bookings";
  const token = await graphToken();

  const rows = tickets.map((ticket) => [
    booking.id,
    booking.paid_at || new Date().toISOString(),
    booking.buyer_name,
    booking.email,
    booking.mobile,
    booking.package_name,
    booking.amount_paise / 100,
    ticket.rider_name,
    ticket.rider_course,
    ticket.ticket_code,
    booking.razorpay_payment_id || "",
    "Paid",
  ]);

  const url = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/workbook/tables/${encodeURIComponent(tableName)}/rows/add`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ index: null, values: rows }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error("Excel row append failed (" + response.status + "): " + body.slice(0, 500));
  }
}
