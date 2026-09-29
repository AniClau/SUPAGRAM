#!/usr/bin/env bash
# Script para levantar el proyecto Suplatzigram (WSL / Linux / macOS)
set -e
cd "$(dirname "$0")"

# 1. Verificar variables de entorno
if [ ! -f .env.local ]; then
  echo "No existe .env.local, creandolo desde env.example..."
  cp env.example .env.local
  echo "Completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local"
fi

# 2. Instalar dependencias si faltan
if [ ! -d node_modules ]; then
  echo "Instalando dependencias..."
  npm install
fi

# 3. Levantar el servidor de desarrollo
echo "Levantando Suplatzigram en http://localhost:3000 ..."
npm run dev
