create extension if not exists pgcrypto;
do $$ begin create type public.user_role as enum ('passenger','driver','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.ride_status as enum ('requested','accepted','arrived','started','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.service_class as enum ('standard','comfort','premium'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null, role public.user_role not null default 'passenger',
 phone text, identity_verified boolean not null default false,
 identity_verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.drivers(
 id uuid primary key references public.profiles(id) on delete cascade,
 is_online boolean not null default false, latitude double precision, longitude double precision,
 battery_percent integer, estimated_battery_km numeric(8,2), wallet_balance numeric(14,2) not null default 0,
 last_location_at timestamptz, updated_at timestamptz not null default now());

create table if not exists public.vehicles(
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.drivers(id) on delete cascade,
 brand text, model text, manufacture_year integer, plate_number text,
 service_class public.service_class not null default 'standard', is_active boolean not null default true,
 vehicle_verified boolean not null default false, vehicle_photo_url text, created_at timestamptz not null default now());

create table if not exists public.vehicle_online_checks(
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.drivers(id) on delete cascade,
 vehicle_id uuid references public.vehicles(id) on delete set null, photo_url text,
 plate_visible boolean not null default false, photo_clear boolean not null default false,
 latitude double precision, longitude double precision, checked_at timestamptz not null default now());

create table if not exists public.rides(
 id uuid primary key default gen_random_uuid(), passenger_id uuid not null references public.profiles(id),
 driver_id uuid references public.drivers(id), pickup_text text not null,
 pickup_lat double precision, pickup_lng double precision, destination_text text,
 destination_lat double precision, destination_lng double precision,
 pickup_distance_km numeric(8,2) not null default 0, trip_distance_km numeric(8,2) not null default 0,
 service_class public.service_class not null default 'standard', estimated_fare numeric(14,2),
 final_fare numeric(14,2), status public.ride_status not null default 'requested',
 requested_at timestamptz not null default now(), accepted_at timestamptz, arrived_at timestamptz,
 started_at timestamptz, completed_at timestamptz, cancelled_at timestamptz,
 cancelled_by uuid references public.profiles(id), cancellation_reason text, created_at timestamptz not null default now());

create index if not exists rides_passenger_idx on public.rides(passenger_id,created_at desc);
create index if not exists rides_status_idx on public.rides(status,created_at);

create table if not exists public.fare_rules(
 id uuid primary key default gen_random_uuid(), city_code text not null, effective_from timestamptz not null default now(),
 effective_to timestamptz, fuel_price_per_liter numeric(12,2) not null,
 vehicle_km_per_liter numeric(8,2) not null, base_fare numeric(12,2) not null default 0,
 service_percent numeric(7,4) not null default .17, tax_percent numeric(7,4) not null default .11,
 maintenance_percent numeric(7,4) not null default .10, labor_percent numeric(7,4) not null default .10,
 health_percent numeric(7,4) not null default .10, old_age_percent numeric(7,4) not null default .05,
 charity_percent numeric(7,4) not null default .025, food_percent numeric(7,4) not null default .075, active boolean not null default true);

create table if not exists public.driver_pool_ledger(
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.drivers(id),
 ride_id uuid references public.rides(id), pool_type text not null,
 amount numeric(14,2) not null, direction text not null default 'credit',
 description text, created_at timestamptz not null default now());

create table if not exists public.payments(
 id uuid primary key default gen_random_uuid(), ride_id uuid not null references public.rides(id) on delete cascade,
 passenger_id uuid not null references public.profiles(id), amount numeric(14,2) not null,
 payment_method text not null default 'internal_balance', status text not null default 'pending',
 provider_reference text, created_at timestamptz not null default now());

create table if not exists public.tips(
 id uuid primary key default gen_random_uuid(), ride_id uuid not null references public.rides(id) on delete cascade,
 passenger_id uuid not null references public.profiles(id), driver_id uuid not null references public.drivers(id),
 amount numeric(14,2) not null check(amount>0), created_at timestamptz not null default now());

create table if not exists public.customer_activity(
 id uuid primary key default gen_random_uuid(), passenger_id uuid not null references public.profiles(id) on delete cascade,
 activity_type text not null, points numeric(12,2) not null default 0,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

create table if not exists public.driver_scan_history(
 id uuid primary key default gen_random_uuid(), passenger_id uuid not null references public.profiles(id),
 driver_id uuid not null references public.drivers(id), latitude double precision, longitude double precision,
 radius_km numeric(6,2) not null default 1, scanned_at timestamptz not null default now());

create table if not exists public.ratings(
 id uuid primary key default gen_random_uuid(), ride_id uuid not null references public.rides(id) on delete cascade,
 passenger_id uuid not null references public.profiles(id), driver_id uuid not null references public.drivers(id),
 stars integer not null check(stars between 1 and 5), comment text, accountability_level numeric(5,2) not null default 1,
 created_at timestamptz not null default now(), unique(ride_id,passenger_id));

create table if not exists public.cancellation_compensation(
 id uuid primary key default gen_random_uuid(), ride_id uuid not null unique references public.rides(id) on delete cascade,
 pickup_distance_completed_km numeric(8,2) not null default 0, fuel_compensation numeric(14,2) not null default 0,
 effort_compensation numeric(14,2) not null default 0, time_compensation numeric(14,2) not null default 0,
 total_compensation numeric(14,2) not null default 0, calculated_at timestamptz not null default now());

create table if not exists public.congestion_evidence(
 id uuid primary key default gen_random_uuid(), ride_id uuid references public.rides(id) on delete set null,
 driver_id uuid not null references public.drivers(id), photo_url text not null,
 latitude double precision, longitude double precision, captured_at timestamptz not null default now(),
 review_status text not null default 'pending');

create table if not exists public.security_events(
 id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
 ride_id uuid references public.rides(id) on delete set null, event_type text not null,
 severity text not null default 'info', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','Pengguna'),coalesce((new.raw_user_meta_data->>'role')::public.user_role,'passenger')) on conflict(id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.create_driver_row() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.role='driver' then insert into public.drivers(id) values(new.id) on conflict do nothing; end if; return new; end $$;
drop trigger if exists profile_driver_row on public.profiles;
create trigger profile_driver_row after insert or update of role on public.profiles for each row execute procedure public.create_driver_row();

alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_online_checks enable row level security;
alter table public.rides enable row level security;
alter table public.fare_rules enable row level security;
alter table public.driver_pool_ledger enable row level security;
alter table public.payments enable row level security;
alter table public.tips enable row level security;
alter table public.customer_activity enable row level security;
alter table public.driver_scan_history enable row level security;
alter table public.ratings enable row level security;
alter table public.cancellation_compensation enable row level security;
alter table public.congestion_evidence enable row level security;
alter table public.security_events enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using(id=auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy drivers_select_auth on public.drivers for select to authenticated using(true);
create policy drivers_update_own on public.drivers for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy vehicles_own_select on public.vehicles for select to authenticated using(driver_id=auth.uid());
create policy vehicles_own_insert on public.vehicles for insert to authenticated with check(driver_id=auth.uid());
create policy rides_select_participants on public.rides for select to authenticated using(passenger_id=auth.uid() or driver_id=auth.uid() or status='requested');
create policy rides_insert_passenger on public.rides for insert to authenticated with check(passenger_id=auth.uid());
create policy rides_update_participant on public.rides for update to authenticated using(passenger_id=auth.uid() or driver_id=auth.uid()) with check(passenger_id=auth.uid() or driver_id=auth.uid());
create policy fare_rules_read on public.fare_rules for select to authenticated using(active=true);
create policy pool_select_own on public.driver_pool_ledger for select to authenticated using(driver_id=auth.uid());
create policy payments_select_own on public.payments for select to authenticated using(passenger_id=auth.uid());
create policy tips_select_participants on public.tips for select to authenticated using(passenger_id=auth.uid() or driver_id=auth.uid());
create policy activity_select_own on public.customer_activity for select to authenticated using(passenger_id=auth.uid());
create policy scan_select_own on public.driver_scan_history for select to authenticated using(passenger_id=auth.uid() or driver_id=auth.uid());
create policy scan_insert_own on public.driver_scan_history for insert to authenticated with check(passenger_id=auth.uid());
create policy ratings_select_participants on public.ratings for select to authenticated using(passenger_id=auth.uid() or driver_id=auth.uid());
create policy ratings_insert_own on public.ratings for insert to authenticated with check(passenger_id=auth.uid());
create policy security_select_own on public.security_events for select to authenticated using(user_id=auth.uid());

insert into public.fare_rules(city_code,fuel_price_per_liter,vehicle_km_per_liter,base_fare)
select 'JKT',12500,40,2500 where not exists(select 1 from public.fare_rules where city_code='JKT' and active=true);
