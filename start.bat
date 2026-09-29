@echo off
REM Script para levantar el proyecto Suplatzigram en Windows
cd /d "%~dp0"

if not exist .env.local (
  echo No existe .env.local, creandolo desde env.example...
  copy env.example .env.local
  echo Completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local
)

if not exist node_modules (
  echo Instalando dependencias...
  call npm install
)

echo Levantando Suplatzigram en http://localhost:3000 ...
call npm run dev
