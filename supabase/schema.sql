create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  customer_info jsonb not null,
  pickup_location text not null check (pickup_location in ('Kemiling', 'Natar')),
  pickup_date date not null,
  pickup_time time not null,
  rental_days integer not null check (rental_days between 1 and 14),
  line_items jsonb not null,
  total_amount integer not null check (total_amount > 0),
  booking_status text not null default 'pending_admin_confirmation',
  created_at timestamptz not null default now()
);

create index if not exists bookings_pickup_date_idx on public.bookings (pickup_date);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

alter table public.bookings enable row level security;

-- There are intentionally no anon/authenticated policies. Booking inserts are
-- handled by the server using the service role key, which must stay private.
