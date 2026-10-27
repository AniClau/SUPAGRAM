"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../lib/client";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Obtener usuario de la sesión
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("No hay sesión activa");
          setIsLoading(false);
          return;
        }

        console.log("👤 Usuario:", user);
        console.log("📋 Metadata:", user.user_metadata);

        // Buscar perfil en la tabla profiles
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        if (profileData) {
          setProfile(profileData);
        } else {
          // Si no existe perfil, crear uno con datos de metadata
          setProfile({
            id: user.id,
            username: user.user_metadata?.username || "",
            avatar_url: null,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar perfil");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground/60">Cargando perfil...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link
            href="/auth/login"
            className="text-primary hover:underline"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Mi Perfil
          </h1>
          <Link
            href="/profile/edit"
            className="text-sm text-primary hover:underline"
          >
            Editar
          </Link>
        </div>
      </header>

      {/* Contenido del perfil */}
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6">
          {/* Avatar */}
          <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary bg-card-bg">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username || "Avatar"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-foreground/40">
                {profile?.username?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Username */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              @{profile?.username || "sin_usuario"}
            </h2>
          </div>

          {/* Botón editar */}
          <Link
            href="/profile/edit"
            className="px-6 py-2 rounded-xl bg-linear-to-r from-primary to-accent text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Editar perfil
          </Link>
        </div>
      </main>
    </div>
  );
}