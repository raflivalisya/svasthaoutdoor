create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  midtrans_order_id text not null unique,
  customer_info jsonb not null,
  pickup_location text not null check (pickup_location in ('Kemiling', 'Natar')),
  pickup_date date not null,
  pickup_time time not null,
  rental_days integer not null check (rental_days between 1 and 30),
  line_items jsonb not null,
  total_amount integer not null check (total_amount > 0),
  deposit_amount integer not null check (deposit_amount > 0),
  booking_status text not null default 'pending',
  payment_status text not null default 'pending',
  payment_type text,
  midtrans_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_payment_status_idx on public.bookings (payment_status);
create index if not exists bookings_pickup_date_idx on public.bookings (pickup_date);

alter table public.bookings enable row level security;

-- There are intentionally no anon/authenticated policies. Booking writes and
-- payment notifications are handled by trusted server routes using the service
-- role key, which must never be exposed to a browser.
