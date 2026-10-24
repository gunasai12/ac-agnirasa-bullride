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
