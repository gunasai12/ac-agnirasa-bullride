# AC Agnirasa Bull Ride — ticket booking website

Next.js application for the Udyami Bazaar event at GD Goenka University on 30 October 2026.

## Packages
- Single Ride — ₹150 (1 rider)
- Duo Ride — ₹280 (2 riders)
- Triple Thrill — ₹420 (3 riders)
- Fearless Five — ₹650 (5 riders)

## Local setup
1. Use Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill the values privately.
4. Run `supabase/schema.sql` in the Supabase SQL Editor.
5. Configure Razorpay **test mode** credentials and a Resend sender verified for your account.
6. Run `npm run dev` and open `http://localhost:3000`.

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the browser)
- `RAZORPAY_KEY_ID` (use test key first)
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_SITE_URL`

## Deploying
Import this repository into Vercel, configure the environment variables in Project Settings, then redeploy. For the first deployment, keep Razorpay in test mode. Configure the webhook endpoint at `/api/razorpay-webhook` after deploying.

## Important production work
This starter has package selection, rider forms, server-side order amount validation, Razorpay checkout/payment verification, a Supabase schema, per-rider QR PNG attachments and confirmation email. It is not ready for live-money launch until you have tested it end to end and hardened idempotency, webhook reconciliation, rate limiting and administrative check-in. The admin scanner and customer feedback form are not yet implemented. Add a privacy notice, cancellation/refund policy, support contact, and event safety rules before public launch.

Never commit `.env.local`, API keys or service-role secrets. Secrets previously posted to chat should be rotated before use.

## Live Excel booking log (Power Automate)

The app sends a server-side notification after a payment is verified. Configure the Microsoft Power Automate flow below to append a row for each rider to your Excel workbook. Supabase remains the primary database; the Excel log is a convenience for event staff.

### 1. Prepare the workbook
Create a workbook named `AC-Agnirasa-Bookings.xlsx` in OneDrive or SharePoint. On the first worksheet, enter these headers in row 1, select the header and an empty row below it, then use **Insert → Table** and confirm “My table has headers”. Name the table `Bookings`.

Use these columns in this exact order:
`Booking ID, Paid At, Buyer Name, Buyer Email, Buyer Mobile, Package, Amount INR, Rider Name, Rider Course, Ticket Code, Razorpay Payment ID, Payment Status`.

### 2. Create the Power Automate flow
1. Open Power Automate and create an **Automated cloud flow** (or Instant cloud flow) with the **When an HTTP request is received** trigger.
2. Use this JSON schema for the trigger:
```json
{
  "type": "object",
  "properties": {
    "bookingId": { "type": "string" },
    "paidAt": { "type": "string" },
    "buyerName": { "type": "string" },
    "buyerEmail": { "type": "string" },
    "buyerMobile": { "type": "string" },
    "packageName": { "type": "string" },
    "amountInr": { "type": "number" },
    "paymentId": { "type": "string" },
    "paymentStatus": { "type": "string" },
    "tickets": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "ticketCode": { "type": "string" },
          "riderName": { "type": "string" },
          "riderCourse": { "type": "string" }
        },
        "required": ["ticketCode", "riderName", "riderCourse"]
      }
    }
  },
  "required": ["bookingId", "paidAt", "buyerName", "buyerEmail", "buyerMobile", "packageName", "amountInr", "paymentId", "paymentStatus", "tickets"]
}
```
3. Add **Apply to each** and select the trigger's `tickets` array.
4. Inside it add **Excel Online (Business) → Add a row into a table**, and select the workbook and `Bookings` table.
5. Map the workbook columns to the trigger fields: Booking ID = `bookingId`; Paid At = `paidAt`; Buyer Name = `buyerName`; Buyer Email = `buyerEmail`; Buyer Mobile = `buyerMobile`; Package = `packageName`; Amount INR = `amountInr`; Rider Name = current ticket `riderName`; Rider Course = current ticket `riderCourse`; Ticket Code = current ticket `ticketCode`; Razorpay Payment ID = `paymentId`; Payment Status = `paymentStatus`.
6. Save the flow and copy its generated HTTP POST URL. Treat the URL as a password because anyone with it may trigger the flow. Use an authenticated/secured trigger if your tenant offers it.

### 3. Connect the app
In Vercel → Project → Settings → Environment Variables, add `POWER_AUTOMATE_EXCEL_WEBHOOK_URL` with the generated flow URL. Redeploy the project. Do not commit the URL to GitHub or paste it in chat.

Test the full flow in Razorpay test mode. A successful checkout should trigger one row for every rider. If the flow fails, inspect its run history and the deployment logs; the booking record and tickets in Supabase remain the primary records.

## Production notes
Before accepting live money, test duplicate payment callbacks, failed email/Excel sync, refunds and check-in. The admin ticket scanner and feedback page are not yet implemented. Add a privacy notice, cancellation/refund policy, support contact and event safety rules before public launch.
