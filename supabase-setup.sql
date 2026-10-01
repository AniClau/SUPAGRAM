-- ============================================================
-- Supagram - Script de configuración de Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Crear la tabla de posts (esquema public)
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_id text,
  image_url text not null,
  caption text,
  likes numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Habilitar RLS y permitir lectura pública (solo SELECT)
alter table public.posts enable row level security;

drop policy if exists "Lectura publica de posts" on public.posts;
create policy "Lectura publica de posts"
  on public.posts
  for select
  using (true);

-- 3. Crear bucket público de storage para las imágenes
insert into storage.buckets (id, name, public)
values ('supagram', 'supagram', true)
on conflict (id) do nothing;

-- Política de lectura pública para el bucket
drop policy if exists "Lectura publica supagram" on storage.objects;
create policy "Lectura publica supagram"
  on storage.objects
  for select
  using (bucket_id = 'supagram');

-- 4. (Opcional) Datos de ejemplo — el feed se verá aunque no subas fotos aún
insert into public.posts (user_id, image_url, caption, likes) values
  ('sofia_photo', 'https://picsum.photos/seed/rank1/600/600', 'Atardecer en la playa, momentos que valen oro', 1250),
  ('diego_travel', 'https://picsum.photos/seed/rank2/600/600', 'Explorando nuevos lugares cada día', 980),
  ('maria_dev', 'https://picsum.photos/seed/rank3/600/600', 'Código y café, la combinación perfecta', 875),
  ('carlos_code', 'https://picsum.photos/seed/rank4/600/600', 'Nuevo proyecto terminado!', 654),
  ('ana_tech', 'https://picsum.photos/seed/rank5/600/600', 'Aprendiendo algo nuevo cada día', 543),
  ('luis_design', 'https://picsum.photos/seed/rank6/600/600', 'El diseño está en los detalles', 421),
  ('paula_art', 'https://picsum.photos/seed/rank7/600/600', 'Arte digital, mi nueva pasión', 389),
  ('jorge_music', 'https://picsum.photos/seed/rank8/600/600', 'La música es vida', 256),
  ('elena_food', 'https://picsum.photos/seed/rank9/600/600', 'Receta del día: pasta casera', 128);

-- ============================================================
-- 5. Permisos para crear posts desde la app (página /post)
--    La app aún no usa el usuario autenticado para publicar,
--    por eso se permite INSERT con la clave pública (anon).
-- ============================================================
drop policy if exists "Insertar posts" on public.posts;
create policy "Insertar posts"
  on public.posts
  for insert
  with check (true);

drop policy if exists "Subir imagenes supagram" on storage.objects;
create policy "Subir imagenes supagram"
  on storage.objects
  for insert
  with check (bucket_id = 'supagram');

-- ============================================================
-- 6. Tabla de usuarios (la usa /auth/register para verificar
--    que el username esté disponible)
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

drop policy if exists "Lectura publica de usuarios" on public.users;
create policy "Lectura publica de usuarios"
  on public.users
  for select
  using (true);

-- Al registrarse en auth.users se crea su fila en public.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', new.id::text));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
