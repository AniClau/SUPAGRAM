-- ============================================================
-- Supagram - Script de configuración de Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
--
-- Basado en el curso "Supabase - Fundamentos". Se puede ejecutar
-- varias veces (usa "if not exists" y "drop policy if exists").
--
-- IMPORTANTE: si ya tienes una tabla public.posts con id numérico
-- (bigint) de una versión anterior de este script, "create table if
-- not exists" NO la cambia. Los likes y comentarios del curso usan
-- post_id UUID, así que en ese caso borra la tabla antes (perderás
-- sus datos):   drop table public.posts cascade;
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla de posts
-- ------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  image_url   text,
  caption     text,
  likes       integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. Tabla de perfiles (la usan /profile, /profile/edit, el feed
--    y el ranking). Una fila por usuario, con el mismo id que
--    auth.users. La fila se crea al guardar el perfil (upsert).
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz default now(),
  username    text,
  avatar_url  text
);

-- ------------------------------------------------------------
-- 3. Likes y comentarios
-- ------------------------------------------------------------
create table if not exists public.likes (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  post_id     uuid not null,
  created_at  timestamptz default now(),
  unique (user_id, post_id)
);

create table if not exists public.comments (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  post_id     uuid not null,
  body        text not null,
  created_at  timestamptz default now()
);

-- Índices para mejor rendimiento
create index if not exists idx_likes_post_id    on public.likes (post_id);
create index if not exists idx_comments_post_id on public.comments (post_id);

-- ------------------------------------------------------------
-- 4. Row Level Security
-- ------------------------------------------------------------

-- Políticas de versiones anteriores de este script. Se borran
-- porque las políticas se suman: "Insertar posts" dejaba publicar
-- a cualquiera y anularía las reglas de abajo.
drop policy if exists "Lectura publica de posts"      on public.posts;
drop policy if exists "Insertar posts"                on public.posts;
drop policy if exists "Lectura publica supagram"      on storage.objects;
drop policy if exists "Subir imagenes supagram"       on storage.objects;

-- profiles: lectura pública; cada usuario crea y edita solo el suyo
alter table public.profiles enable row level security;

drop policy if exists profiles_select_public         on public.profiles;
drop policy if exists profiles_insert_authenticated  on public.profiles;
drop policy if exists profiles_update_authenticated  on public.profiles;

create policy profiles_select_public
  on public.profiles
  for select
  using (true);

create policy profiles_insert_authenticated
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_authenticated
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- posts: lectura pública; solo usuarios autenticados publican como ellos mismos
alter table public.posts enable row level security;

drop policy if exists posts_select_public         on public.posts;
drop policy if exists posts_insert_authenticated  on public.posts;

create policy posts_select_public
  on public.posts
  for select
  to public
  using (true);

create policy posts_insert_authenticated
  on public.posts
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- likes: cada usuario da y quita sus propios likes
alter table public.likes enable row level security;

drop policy if exists likes_select_public         on public.likes;
drop policy if exists likes_insert_authenticated  on public.likes;
drop policy if exists likes_delete_authenticated  on public.likes;

-- (No está en el curso) Sin una política de lectura, RLS bloquea
-- el SELECT y no se podrían contar ni consultar los likes.
create policy likes_select_public
  on public.likes
  for select
  to public
  using (true);

create policy likes_insert_authenticated
  on public.likes
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy likes_delete_authenticated
  on public.likes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- comments: lectura pública; cada usuario gestiona los suyos
alter table public.comments enable row level security;

drop policy if exists comments_select_public         on public.comments;
drop policy if exists comments_insert_authenticated  on public.comments;
drop policy if exists comments_update_authenticated  on public.comments;
drop policy if exists comments_delete_authenticated  on public.comments;

create policy comments_select_public
  on public.comments
  for select
  to public
  using (true);

create policy comments_insert_authenticated
  on public.comments
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy comments_update_authenticated
  on public.comments
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy comments_delete_authenticated
  on public.comments
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 5. Storage: bucket público "supagram" (fotos de posts en
--    images/ y avatares en profile/). Lectura pública; subir
--    solo con sesión iniciada.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('supagram', 'supagram', true)
on conflict (id) do nothing;

drop policy if exists supagram_select_public         on storage.objects;
drop policy if exists supagram_insert_authenticated  on storage.objects;

create policy supagram_select_public
  on storage.objects
  for select
  using (bucket_id = 'supagram');

create policy supagram_insert_authenticated
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'supagram');

-- ------------------------------------------------------------
-- 6. Tabla de usuarios (la consulta /auth/register para ver que
--    el username esté libre). No es parte del curso: el registro
--    funciona sin ella, pero entonces no valida usernames repetidos.
-- ------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique not null,
  created_at  timestamptz default now()
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

-- ------------------------------------------------------------
-- 7. (Opcional) Datos de ejemplo del curso. Solo se insertan si
--    la tabla posts está vacía. Las imágenes usan picsum.photos
--    porque next.config.ts solo permite ese host, pravatar y
--    *.supabase.co. Los user_id son ficticios, así que estos
--    posts se verán como "default user" (no tienen perfil).
-- ------------------------------------------------------------
insert into public.posts (user_id, image_url, caption, likes)
select v.user_id::uuid, v.image_url, v.caption, v.likes
from (values
  ('11111111-1111-1111-1111-111111111111', 'https://picsum.photos/seed/image11/600/600', 'Caminos sin rumbo fijo 🚶‍♂️', 42),
  ('22222222-2222-2222-2222-222222222222', 'https://picsum.photos/seed/image12/600/600', 'Ciudades que nunca duermen 🌃', 67),
  ('33333333-3333-3333-3333-333333333333', 'https://picsum.photos/seed/image13/600/600', 'Montañas que tocan el cielo 🗻', 18),
  ('44444444-4444-4444-4444-444444444444', 'https://picsum.photos/seed/image14/600/600', 'Ríos de aventura 🌊', 89),
  ('55555555-5555-5555-5555-555555555555', 'https://picsum.photos/seed/image15/600/600', 'Desiertos infinitos 🏜️', 31),
  ('66666666-6666-6666-6666-666666666666', 'https://picsum.photos/seed/image16/600/600', 'Selvas llenas de vida 🌴', 55),
  ('77777777-7777-7777-7777-777777777777', 'https://picsum.photos/seed/image17/600/600', 'Nieve y aventura ❄️', 73),
  ('88888888-8888-8888-8888-888888888888', 'https://picsum.photos/seed/image18/600/600', 'Islas perdidas 🏝️', 27),
  ('99999999-9999-9999-9999-999999999999', 'https://picsum.photos/seed/image19/600/600', 'Caminos rurales 🛤️', 94),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://picsum.photos/seed/image20/600/600', 'Metrópolis vibrantes 🏙️', 38),
  ('11111111-1111-1111-1111-111111111111', 'https://picsum.photos/seed/image21/600/600', 'Horizontes infinitos 🌅', 62),
  ('22222222-2222-2222-2222-222222222222', 'https://picsum.photos/seed/image22/600/600', 'Culturas fascinantes 🎎', 15),
  ('33333333-3333-3333-3333-333333333333', 'https://picsum.photos/seed/image23/600/600', 'Arquitectura sorprendente 🏰', 81),
  ('44444444-4444-4444-4444-444444444444', 'https://picsum.photos/seed/image24/600/600', 'Senderos secretos 🥾', 46),
  ('55555555-5555-5555-5555-555555555555', 'https://picsum.photos/seed/image25/600/600', 'Océanos azules 🌊', 29),
  ('66666666-6666-6666-6666-666666666666', 'https://picsum.photos/seed/image26/600/600', 'Mercados locales 🛒', 77),
  ('77777777-7777-7777-7777-777777777777', 'https://picsum.photos/seed/image27/600/600', 'Fiestas tradicionales 🎉', 52),
  ('88888888-8888-8888-8888-888888888888', 'https://picsum.photos/seed/image28/600/600', 'Paisajes de ensueño 💭', 63),
  ('99999999-9999-9999-9999-999999999999', 'https://picsum.photos/seed/image29/600/600', 'Caminos de piedra 🪨', 19),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://picsum.photos/seed/image30/600/600', 'Aventuras compartidas 👫', 88)
) as v (user_id, image_url, caption, likes)
where not exists (select 1 from public.posts);
