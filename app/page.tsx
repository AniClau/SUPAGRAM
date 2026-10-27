"use client";

import { useEffect, useState } from "react";
import PostCard from "./components/PostCard";
import { supabase } from "./utils/supabase";
import { Post } from "./tipe";


export default function Home() {
  
  const [posts, setPosts] = useState<Post[]>([])

  const handleLike = (postId: number | string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  useEffect(() => {
    const fetchPosts = async () => {
      // 1. Obtener posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) {
        console.error("Error al obtener los posts:", postsError);
        return;
      }

      // 2. Obtener IDs únicos de usuarios
      const userIds = [...new Set(postsData.map((p) => p.user_id))];

      // 3. Buscar profiles de esos usuarios
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      // 4. Crear mapa de profiles por ID
      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url }]) || []
      );

      // 5. Combinar posts con profiles
      const postsWithProfiles = postsData.map((post) => ({
        ...post,
        profile: profilesMap.get(post.user_id),
      }));

      setPosts(postsWithProfiles);
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Supagram
          </h1>
        </div>
      </header>

      {/* Feed de posts */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={handleLike} />
          ))}
        </div>
      </main>
    </div>
  );
}