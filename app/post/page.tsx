"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function CreatePage() {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadAndCreatePost = async (file: File) => {
    // 1️⃣ Preparar nombre del archivo
    const fileExt = file.name.split(".").pop();
    const fileName = `${file.name.replace(/\.[^/.]+$/, "")}-${Date.now()}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    // 2️⃣ Subir al bucket "supagram"
    const { error: uploadError } = await supabase.storage
      .from("supagram")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Error al subir imagen:", uploadError);
      throw uploadError;
    }

    // 3️⃣ Obtener URL pública
    const { data: urlData } = supabase.storage
      .from("supagram")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log("📸 Imagen subida:", publicUrl);

    // 4️⃣ Crear el post en la tabla posts
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .insert({
        image_url: publicUrl,
        caption: caption,
        likes: 0,
      })
      .select("*");

    if (postError) {
      console.error("❌ Error creando el post:", postError);
      throw postError;
    }

    console.log("🆕 Post creado:", postData);

    return {
      uploadedImageUrl: publicUrl,
      newPost: postData,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      setMessage({ type: "error", text: "Por favor selecciona una imagen" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await uploadAndCreatePost(imageFile);

      // Éxito
      setMessage({ type: "success", text: "¡Post creado exitosamente!" });
      setImageFile(null);
      setImagePreview(null);
      setCaption("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Redirigir al inicio después de 1.5 segundos
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Ocurrió un error al subir la publicación";
      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Crear Post
          </h1>
        </div>
      </header>

      {/* Formulario */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Mensajes de feedback */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm text-center ${
                message.type === "success"
                  ? "bg-green-500/20 text-green-500 border border-green-500/30"
                  : "bg-red-500/20 text-red-500 border border-red-500/30"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Selector de imagen */}
          <div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              id="file-upload"
            />

            {!imagePreview ? (
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/60 transition-colors bg-card-bg p-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-primary"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-foreground">Seleccionar imagen</p>
                <p className="text-xs text-foreground/50 mt-1">PNG, JPG, WEBP hasta 10MB</p>
              </label>
            ) : (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-border">
                <Image
                  src={imagePreview}
                  alt="Vista previa"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="flex flex-col gap-2">
            <label htmlFor="caption" className="text-sm font-medium text-foreground">
              Pie de foto (caption)
            </label>
            <textarea
              id="caption"
              rows={3}
              placeholder="Escribe un pie de foto..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full p-3 rounded-xl bg-card-bg border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
            />
          </div>

          {/* Botón de publicar */}
          <button
            type="submit"
            disabled={isLoading || !imageFile}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 transition-opacity active:scale-[0.99]"
          >
            {isLoading ? "Publicando..." : "Compartir post"}
          </button>
        </form>
      </main>
    </div>
  );
}
