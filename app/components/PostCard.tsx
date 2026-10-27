import Image from "next/image";
import { getTimeAgo } from "../utils/time";
import HeartIcon from "./HeartIcon";
import { Post, PostCardProps } from "../tipe";

const DEFAULT_AVATAR = "/user"

export default function PostCard({ post, onLike }: PostCardProps) {

  const username = post.profile?.username || "default user"
  const avatarUrl = post.profile?.avatar_url || DEFAULT_AVATAR

  return (
    <article className="bg-card-bg border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header con usuario y avatar */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary">
          {
            avatarUrl ? (
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
            )
          } 
          
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">@{username}</span>
          <span className="text-xs text-foreground/50">{getTimeAgo(new Date(post.created_at))}</span>
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
        {/* Botón de like con contador */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLike(post.id)}
            className="hover:scale-110 transition-transform active:scale-95"
            aria-label={post.isLiked ? "Quitar like" : "Dar like"}
          >
            <HeartIcon filled={post.isLiked} />
          </button>
          <span className="font-semibold text-foreground">
            {post.likes.toLocaleString()} likes
          </span>
        </div>

        {/* Caption */}
        <p className="mt-2 text-foreground">
          <span className="font-semibold">@{username}</span>{" "}
          <span className="text-foreground/80">{post.caption}</span>
        </p>
      </div>
    </article>
  );
}