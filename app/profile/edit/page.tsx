"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../lib/client";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function EditProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUsername = (value: string) => {
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!value) {
      return "El nombre de usuario es requerido";
    }
    if (value.length < 3) {
      return "Mínimo 3 caracteres";
    }
    if (value.length > 20) {
      return "Máximo 20 caracteres";
    }
    if (!regex.test(value)) {
      return "Solo letras, números y guión bajo";
    }
    return "";
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    setUsernameError(validateUsername(value));
  };

  const checkUsernameAvailable = async (newUsername: string, currentUserId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", newUsername)
      .neq("id", currentUserId)
      .single();

    if (error && error.code === "PGRST116") {
      return true; // No existe, está disponible
    }
    return !data;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setMessage({ type: "error", text: "No hay sesión activa" });
          setIsLoading(false);
          return;
        }

        // Buscar perfil existente
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        const currentProfile = profileData || {
          id: user.id,
          username: user.user_metadata?.username || "",
          avatar_url: null,
        };

        setProfile(currentProfile);
        setUsername(currentProfile.username);
        setOriginalUsername(currentProfile.username);
        if (currentProfile.avatar_url) {
          setAvatarPreview(currentProfile.avatar_url);
        }
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error al cargar perfil",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setMessage(null);

    // Validar username
    const usernameValidation = validateUsername(username);
    if (usernameValidation) {
      setMessage({ type: "error", text: usernameValidation });
      setIsSaving(false);
      return;
    }

    // Verificar unicidad si cambió el username
    if (username !== originalUsername) {
      const isAvailable = await checkUsernameAvailable(username, profile.id);
      if (!isAvailable) {
        setMessage({ type: "error", text: "Este nombre de usuario ya está en uso" });
        setIsSaving(false);
        return;
      }
    }

    try {
      let avatarUrl = profile.avatar_url;

      // Subir avatar si hay uno nuevo
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("supagram")
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("supagram")
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
      }

      // Upsert en profiles (insert o update)
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: profile.id,
          username,
          avatar_url: avatarUrl,
        });

      if (upsertError) throw upsertError;

      // Actualizar metadata del usuario
      await supabase.auth.updateUser({
        data: { username },
      });

      setMessage({ type: "success", text: "¡Perfil actualizado!" });
      setOriginalUsername(username);
      setProfile({ ...profile, username, avatar_url: avatarUrl });
      setAvatarFile(null);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error al guardar",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground/60">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/profile" className="text-foreground/60 hover:text-foreground">
            Cancelar
          </Link>
          <h1 className="text-xl font-bold text-foreground">Editar perfil</h1>
          <button
            type="submit"
            form="edit-form"
            disabled={isSaving}
            className="text-primary font-semibold disabled:opacity-50"
          >
            {isSaving ? "..." : "Guardar"}
          </button>
        </div>
      </header>

      {/* Formulario */}
      <main className="max-w-lg mx-auto px-4 py-8">
        <form id="edit-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-primary bg-card-bg">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-foreground/40">
                  {username?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-primary text-sm font-semibold hover:underline"
            >
              Cambiar foto
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-foreground/60">Nombre de usuario</label>
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="nombre_usuario"
              required
              minLength={3}
              maxLength={20}
              className={`w-full px-4 py-3 rounded-xl bg-card-bg border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                usernameError ? "border-red-500" : "border-border"
              }`}
            />
            {usernameError && (
              <span className="text-red-500 text-xs">{usernameError}</span>
            )}
            <span className="text-xs text-foreground/40">
              Solo letras, números y guión bajo. Sin espacios.
            </span>
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div
              className={`px-4 py-3 rounded-xl text-sm ${
                message.type === "success"
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}
            >
              {message.text}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}