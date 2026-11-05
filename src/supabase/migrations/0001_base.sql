-- Función genérica para updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Perfil del usuario
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  moneda text not null default 'MXN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Canales de venta (comisión y liberación configurables, no son tarifas oficiales)
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) > 0),
  tipo text not null check (tipo in
    ('amazon_fba','amazon_fbm','mercado_libre','marketplace','instagram','directa','otro')),
  comision_pct numeric(6,3) not null default 0 check (comision_pct >= 0 and comision_pct <= 100),
  dias_liberacion integer not null default 0 check (dias_liberacion >= 0 and dias_liberacion <= 365),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nombre)
);

create index channels_user_id_idx on public.channels(user_id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger channels_updated_at before update on public.channels
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.channels enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "channels_select_own" on public.channels
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "channels_insert_own" on public.channels
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "channels_update_own" on public.channels
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "channels_delete_own" on public.channels
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Al registrarse: crear perfil y canales iniciales (comisión 0: tú la configuras)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.channels (user_id, nombre, tipo) values
    (new.id, 'Amazon FBA',     'amazon_fba'),
    (new.id, 'Mercado Libre',  'mercado_libre'),
    (new.id, 'Marketplace',    'marketplace'),
    (new.id, 'Instagram',      'instagram'),
    (new.id, 'Venta directa',  'directa');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();