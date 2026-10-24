create extension if not exists pgcrypto;
create table if not exists public.bookings (
  id uuid primary key, buyer_name text not null, email text not null, mobile text not null,
  package_name text not null check (package_name in ('Single Ride','Duo Ride','Triple Thrill','Fearless Five')),
  rider_count integer not null check (rider_count in (1,2,3,5)),
  amount_paise integer not null check (amount_paise in (15000,28000,42000,65000)),
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  razorpay_order_id text unique not null, razorpay_payment_id text unique, riders jsonb not null,
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id),
  ticket_code text unique not null, rider_name text not null, rider_course text not null,
  status text not null default 'valid' check (status in ('valid','used','cancelled')),
  scanned_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(), booking_id uuid references public.bookings(id),
  rating integer not null check (rating between 1 and 5), comment text check (char_length(comment) <= 1500),
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
alter table public.tickets enable row level security;
alter table public.feedback enable row level security;
