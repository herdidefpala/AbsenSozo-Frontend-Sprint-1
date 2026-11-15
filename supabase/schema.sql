create extension if not exists pgcrypto;

create table if not exists public.employee_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  employee_code text not null unique,
  full_name text not null,
  department text not null default 'Operasional',
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_employee_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  employee_name text := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  employee_code_value text := nullif(upper(btrim(new.raw_user_meta_data ->> 'employee_code')), '');
  employee_department text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'department'), ''), 'Operasional');
begin
  if employee_name is null then
    raise exception 'Nama karyawan wajib diisi.';
  end if;
  if employee_code_value is null then
    raise exception 'Kode karyawan wajib diisi.';
  end if;

  insert into public.employee_profiles (user_id, employee_code, full_name, department, role)
  values (new.id, employee_code_value, employee_name, employee_department, 'employee');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_employee on auth.users;
create trigger on_auth_user_created_employee
after insert on auth.users
for each row execute function public.handle_new_employee_signup();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employee_profiles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.is_employee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employee_profiles
    where user_id = (select auth.uid())
      and role = 'employee'
  );
$$;

revoke all on function public.is_employee() from public;
grant execute on function public.is_employee() to authenticated;

create table if not exists public.work_schedules (
  id text primary key default 'default' check (id = 'default'),
  start_time time not null default '08:00',
  end_time time not null default '17:00',
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

insert into public.work_schedules (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.office_locations (
  id text primary key default 'default' check (id = 'default'),
  latitude double precision,
  longitude double precision,
  radius_m integer not null default 100 check (radius_m between 1 and 10000),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null)),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

insert into public.office_locations (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_date date not null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  scheduled_start_time time not null default '08:00',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m integer not null check (accuracy_m > 0),
  photo_path text not null,
  created_at timestamptz not null default now(),
  unique (user_id, work_date)
);

alter table public.attendance_records
add column if not exists scheduled_start_time time not null default '08:00';

alter table public.attendance_records
add column if not exists check_out_at timestamptz;

create or replace function public.set_attendance_check_in()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  office public.office_locations%rowtype;
  distance_m double precision;
begin
  new.user_id := coalesce((select auth.uid()), new.user_id);
  new.work_date := (now() at time zone 'Asia/Jakarta')::date;
  new.check_in_at := now();
  select * into office
  from public.office_locations
  where id = 'default';
  if office.latitude is null or office.longitude is null then
    raise exception 'Lokasi kantor belum diatur oleh administrator.';
  end if;

  distance_m := 6371000::double precision * 2 * asin(sqrt(least(
    1::double precision,
    power(sin(radians(new.latitude - office.latitude) / 2), 2)
      + cos(radians(office.latitude)) * cos(radians(new.latitude))
      * power(sin(radians(new.longitude - office.longitude) / 2), 2)
  )));
  if distance_m > office.radius_m then
    raise exception 'Check-in ditolak: posisi berada di luar radius kantor.';
  end if;

  new.scheduled_start_time := (
    select start_time
    from public.work_schedules
    where id = 'default'
  );
  if new.scheduled_start_time is null then
    raise exception 'Jadwal kerja standar belum tersedia.';
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists set_attendance_check_in on public.attendance_records;
create trigger set_attendance_check_in
before insert on public.attendance_records
for each row execute function public.set_attendance_check_in();

create or replace function public.set_attendance_check_out()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from old.user_id then
    raise exception 'Anda hanya dapat melakukan check-out pada absensi sendiri.';
  end if;
  if old.check_out_at is not null then
    raise exception 'Check-out sudah tercatat.';
  end if;
  new.check_out_at := now();
  return new;
end;
$$;

drop trigger if exists set_attendance_check_out on public.attendance_records;
create trigger set_attendance_check_out
before update of check_out_at on public.attendance_records
for each row execute function public.set_attendance_check_out();

alter table public.employee_profiles enable row level security;
alter table public.attendance_records enable row level security;
alter table public.work_schedules enable row level security;
alter table public.office_locations enable row level security;

drop policy if exists "Authenticated users can read work schedule" on public.work_schedules;
create policy "Authenticated users can read work schedule"
on public.work_schedules for select to authenticated
using (true);

drop policy if exists "Admins can update work schedule" on public.work_schedules;
create policy "Admins can update work schedule"
on public.work_schedules for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Authenticated users can read office location" on public.office_locations;
create policy "Authenticated users can read office location"
on public.office_locations for select to authenticated
using (true);

drop policy if exists "Admins can update office location" on public.office_locations;
create policy "Admins can update office location"
on public.office_locations for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Employees can read own profile" on public.employee_profiles;
create policy "Employees can read own profile"
on public.employee_profiles for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Admins can insert profiles" on public.employee_profiles;
create policy "Admins can insert profiles"
on public.employee_profiles for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists "Admins can update profiles" on public.employee_profiles;
create policy "Admins can update profiles"
on public.employee_profiles for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Employees can read own attendance" on public.attendance_records;
create policy "Employees can read own attendance"
on public.attendance_records for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Employees can submit own attendance" on public.attendance_records;
create policy "Employees can submit own attendance"
on public.attendance_records for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select public.is_employee())
  and split_part(photo_path, '/', 1) = (select auth.uid())::text
);

drop policy if exists "Employees can check out own attendance" on public.attendance_records;
create policy "Employees can check out own attendance"
on public.attendance_records for update to authenticated
using (
  user_id = (select auth.uid())
  and (select public.is_employee())
  and check_out_at is null
)
with check (
  user_id = (select auth.uid())
  and (select public.is_employee())
  and check_out_at is not null
);

grant select on public.employee_profiles to authenticated;
grant update on public.employee_profiles to authenticated;
grant select, update on public.work_schedules to authenticated;
grant select, update on public.office_locations to authenticated;
grant insert, select on public.attendance_records to authenticated;
revoke update on public.attendance_records from authenticated;
revoke update (check_out_at) on public.attendance_records from authenticated;
grant update (check_out_at) on public.attendance_records to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attendance-photos', 'attendance-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own attendance photos" on storage.objects;
create policy "Users upload own attendance photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'attendance-photos'
  and (select public.is_employee())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users read own or admins read all attendance photos" on storage.objects;
create policy "Users read own or admins read all attendance photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'attendance-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);

drop policy if exists "Users remove own attendance photos" on storage.objects;
create policy "Users remove own attendance photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'attendance-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);
