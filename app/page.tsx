"use client";

import { useState, useEffect } from "react";
import { Post, Comment } from "./types";
import { supabase } from "./lib/client";
import PostCard from "./components/PostCard";


export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Obtener usuario actual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Toggle like: insertar o eliminar de tabla likes
  const handleLike = async (postId: number | string) => {
    if (!currentUserId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.isLiked) {
      // Quitar like
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", currentUserId)
        .eq("post_id", postId);

      if (!error) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: false, likes_count: p.likes_count - 1 }
              : p
          )
        );
      }
    } else {
      // Dar like
      const { error } = await supabase
        .from("likes")
        .insert({ user_id: currentUserId, post_id: postId });

      if (!error) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: true, likes_count: p.likes_count + 1 }
              : p
          )
        );
      }
    }
  };

  // Agregar comentario
  const handleComment = async (postId: number | string, body: string) => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("comments")
      .insert({ user_id: currentUserId, post_id: postId, body })
      .select("id, user_id, post_id, body, created_at")
      .single();

    if (!error && data) {
      // Obtener profile del usuario actual
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", currentUserId)
        .single();

      const newComment: Comment = {
        ...data,
        profile: profileData || undefined,
      };

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...(p.comments || []), newComment] }
            : p
        )
      );
    }
  };

  // Cargar posts con likes y comentarios
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

      const postIds = postsData.map((p) => p.id);
      const userIds = [...new Set(postsData.map((p) => p.user_id))];

      // 2. Obtener profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url }]) || []
      );

      // 3. Contar likes por post
      const { data: likesCountData } = await supabase
        .from("likes")
        .select("post_id")
        .in("post_id", postIds);

      const likesCountMap = new Map<string | number, number>();
      likesCountData?.forEach((like) => {
        const count = likesCountMap.get(like.post_id) || 0;
        likesCountMap.set(like.post_id, count + 1);
      });

      // 4. Verificar likes del usuario actual
      let userLikesSet = new Set<string | number>();
      if (currentUserId) {
        const { data: userLikesData } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", currentUserId)
          .in("post_id", postIds);

        userLikesSet = new Set(userLikesData?.map((l) => l.post_id) || []);
      }

      // 5. Obtener comentarios
      const { data: commentsData } = await supabase
        .from("comments")
        .select("id, user_id, post_id, body, created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });

      // Obtener profiles de comentadores
      const commenterIds = [...new Set(commentsData?.map((c) => c.user_id) || [])];
      const { data: commenterProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", commenterIds);

      const commenterProfilesMap = new Map(
        commenterProfiles?.map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url }]) || []
      );

      // Agrupar comentarios por post
      const commentsMap = new Map<string | number, Comment[]>();
      commentsData?.forEach((comment) => {
        const postComments = commentsMap.get(comment.post_id) || [];
        postComments.push({
          ...comment,
          profile: commenterProfilesMap.get(comment.user_id),
        });
        commentsMap.set(comment.post_id, postComments);
      });

      // 6. Combinar todo
      const postsWithData: Post[] = postsData.map((post) => ({
        ...post,
        profile: profilesMap.get(post.user_id),
        likes_count: likesCountMap.get(post.id) || 0,
        isLiked: userLikesSet.has(post.id),
        comments: commentsMap.get(post.id) || [],
      }));

      setPosts(postsWithData);
    };

    fetchPosts();
  }, [currentUserId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card-bg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Suplatzigram
          </h1>
        </div>
      </header>

      {/* Feed de posts */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onLike={handleLike}
              onComment={handleComment}
            />
          ))}
        </div>
      </main>
    </div>
  );
}