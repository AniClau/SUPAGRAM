"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("users")
      .select("username")
      .eq("username", username)
      .single();

    if (error && error.code === "PGRST116") {
      return true; // No existe, está disponible
    }
    return !data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden" });
      setIsLoading(false);
      return;
    }

    const usernameValidation = validateUsername(username);
    if (usernameValidation) {
      setMessage({ type: "error", text: usernameValidation });
      setIsLoading(false);
      return;
    }

    const isAvailable = await checkUsernameAvailable(username);
    if (!isAvailable) {
      setMessage({ type: "error", text: "Este nombre de usuario ya está en uso" });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        // Optional
        options: {
          data: {
            username,
            role: "user",
          },
        },
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.",
      });
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Error al registrarse",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Supagram
          </h1>
          <p className="text-foreground/60 mt-2">Crea tu cuenta</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Nombre de usuario"
              required
              minLength={3}
              maxLength={20}
              className={`w-full px-4 py-3 rounded-xl bg-card-bg border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                usernameError ? "border-red-500" : "border-border"
              }`}
            />
            {usernameError && (
              <span className="text-red-500 text-xs px-1">{usernameError}</span>
            )}
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            required
            className="w-full px-4 py-3 rounded-xl bg-card-bg border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-card-bg border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar contraseña"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-card-bg border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-primary to-accent text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        {/* Link a login */}
        <p className="text-center text-foreground/60 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
