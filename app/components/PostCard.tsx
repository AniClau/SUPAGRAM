"use client";

import { useState } from "react";
import Image from "next/image";
import { PostCardProps } from "../types";
import { getTimeAgo } from "../utils/time";
import { HeartIcon } from "./HeartIcon";

const DEFAULT_AVATAR = "/user.webp";

export default function PostCard({ post, currentUserId, onLike, onComment }: PostCardProps) {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const username = post.profile?.username || "default_user";
  const avatarUrl = post.profile?.avatar_url || DEFAULT_AVATAR;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;
    onComment(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <article className="bg-card-bg border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header con usuario y avatar */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary bg-card-bg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={username}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg text-foreground/40">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            @{username}
          </span>
          <span className="text-xs text-foreground/50">
            {getTimeAgo(new Date(post.created_at))}
          </span>
        </div>
      </div>

      {/* Imagen del post */}
      <div className="relative w-full aspect-square">
        <Image
          src={post.image_url}
          alt={`Post de ${username}`}
          fill
          className="object-cover"
        />
      </div>

      {/* Acciones y caption */}
      <div className="p-4">
        {/* Botones de like y comentario */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => currentUserId && onLike(post.id)}
            className={`hover:scale-110 transition-transform active:scale-95 ${!currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={post.isLiked ? "Quitar like" : "Dar like"}
            disabled={!currentUserId}
          >
            <HeartIcon filled={post.isLiked || false} />
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="hover:scale-110 transition-transform active:scale-95"
            aria-label="Ver comentarios"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-7 h-7 text-foreground"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
              />
            </svg>
          </button>
        </div>

        {/* Contador de likes */}
        <span className="font-semibold text-foreground mt-2 block">
          {post.likes_count.toLocaleString()} likes
        </span>

        {/* Caption */}
        <p className="mt-2 text-foreground">
          <span className="font-semibold">@{username}</span>{" "}
          <span className="text-foreground/80">{post.caption}</span>
        </p>

        {/* Comentarios */}
        {post.comments && post.comments.length > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-foreground/50 text-sm mt-2 hover:text-foreground/70"
          >
            Ver {post.comments.length} comentario{post.comments.length !== 1 ? 's' : ''}
          </button>
        )}

        {/* Lista de comentarios */}
        {showComments && post.comments && post.comments.length > 0 && (
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {post.comments.map((comment) => (
              <div key={comment.id} className="text-sm">
                <span className="font-semibold text-foreground">
                  @{comment.profile?.username || "usuario"}
                </span>{" "}
                <span className="text-foreground/80">{comment.body}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input de comentario */}
        {currentUserId && (
          <form onSubmit={handleSubmitComment} className="mt-3 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Añade un comentario..."
              className="flex-1 bg-transparent border-b border-border text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary py-1"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="text-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Publicar
            </button>
          </form>
        )}
      </div>
    </article>
  );
}