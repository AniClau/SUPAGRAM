import Image from "next/image";
import { getTimeAgo } from "../utils/time";
import HeartIcon from "./HeartIcon";
import { Post } from "../tipe";

export default function PostCard({ post, onLike }: { post: Post; onLike: (id: number | string) => void }) {
  return (
    <article className="bg-card-bg border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header con usuario y avatar */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary">
          <Image
            src={post.user?.avatar || 'https://i.pravatar.cc/150?img=9'}
            alt={post.user?.username || 'default user'}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{post.user?.username || 'default user'}</span>
          <span className="text-xs text-foreground/50">{getTimeAgo(new Date(post.created_at))}</span>
        </div>
      </div>

      {/* Imagen del post */}
      <div className="relative w-full aspect-square">
        <Image
          src={post.image_url}
          alt={`Post de ${post.user?.username || 'default user'}`}
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
          <span className="font-semibold">{post.user?.username || 'default user'}</span>{" "}
          <span className="text-foreground/80">{post.caption}</span>
        </p>
      </div>
    </article>
  );
}