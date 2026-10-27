-- ============================================================
-- Supagram - Emparejamiento con la rama "realtime"
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Ejecuta SOLO este archivo (no vuelvas a correr supabase-setup.sql).
-- Es idempotente: se puede ejecutar varias veces.
-- ============================================================
-- 7.1 profiles (la usan Home, Rank, Perfil y Dashboard)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Lectura publica de profiles" on public.profiles;
create policy "Lectura publica de profiles"
  on public.profiles for select using (true);

drop policy if exists "Crear mi profile" on public.profiles;
create policy "Crear mi profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Editar mi profile" on public.profiles;
create policy "Editar mi profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Si profiles ya existía, asegura la columna que usa la app
alter table public.profiles add column if not exists avatar_url text;

-- Crea el profile de los usuarios que ya existen en auth.users
insert into public.profiles (id, username)
select id, coalesce(raw_user_meta_data ->> 'username', id::text)
from auth.users
on conflict do nothing;

-- Al registrarse se crea su fila en profiles (y en users, si esa tabla existe)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  uname text := coalesce(new.raw_user_meta_data ->> 'username', new.id::text);
begin
  if to_regclass('public.users') is not null then
    insert into public.users (id, username) values (new.id, uname)
      on conflict do nothing;
  end if;
  insert into public.profiles (id, username) values (new.id, uname)
    on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7.2 likes (un like por usuario y post)
do $$
declare pid_type text;
begin
  select format_type(atttypid, atttypmod) into pid_type
  from pg_attribute where attrelid = 'public.posts'::regclass and attname = 'id';
  execute format($f$
    create table if not exists public.likes (
      id bigint generated always as identity primary key,
      user_id uuid not null references auth.users (id) on delete cascade,
      post_id %s not null references public.posts (id) on delete cascade,
      created_at timestamptz default now(),
      unique (user_id, post_id)
    )$f$, pid_type);
end $$;

alter table public.likes enable row level security;

drop policy if exists "Lectura publica de likes" on public.likes;
create policy "Lectura publica de likes"
  on public.likes for select using (true);

drop policy if exists "Dar like" on public.likes;
create policy "Dar like"
  on public.likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Quitar mi like" on public.likes;
create policy "Quitar mi like"
  on public.likes for delete to authenticated
  using (auth.uid() = user_id);

-- 7.3 comments
do $$
declare pid_type text;
begin
  select format_type(atttypid, atttypmod) into pid_type
  from pg_attribute where attrelid = 'public.posts'::regclass and attname = 'id';
  execute format($f$
    create table if not exists public.comments (
      id bigint generated always as identity primary key,
      user_id uuid not null references auth.users (id) on delete cascade,
      post_id %s not null references public.posts (id) on delete cascade,
      body text not null check (char_length(body) > 0),
      created_at timestamptz default now()
    )$f$, pid_type);
end $$;

alter table public.comments enable row level security;

drop policy if exists "Lectura publica de comments" on public.comments;
create policy "Lectura publica de comments"
  on public.comments for select using (true);

drop policy if exists "Comentar" on public.comments;
create policy "Comentar"
  on public.comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Borrar mi comentario" on public.comments;
create policy "Borrar mi comentario"
  on public.comments for delete to authenticated
  using (auth.uid() = user_id);

-- 7.4 posts: ahora los crea el usuario logueado (user_id = auth.uid())
--     (se compara como texto para funcionar si user_id es text o uuid)
drop policy if exists "Insertar posts" on public.posts;
create policy "Insertar posts"
  on public.posts for insert to authenticated
  with check (user_id::text = auth.uid()::text);

drop policy if exists "Borrar mis posts" on public.posts;
create policy "Borrar mis posts"
  on public.posts for delete to authenticated
  using (user_id::text = auth.uid()::text);

-- 7.5 Storage: subir imágenes (posts y avatares) solo autenticado
drop policy if exists "Subir imagenes supagram" on storage.objects;
create policy "Subir imagenes supagram"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'supagram');

-- 7.6 Realtime: el Dashboard escucha INSERT/DELETE en estas tablas
do $$
declare t text;
begin
  foreach t in array array['posts', 'likes', 'comments', 'profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
