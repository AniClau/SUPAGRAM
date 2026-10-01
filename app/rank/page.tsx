"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import HeartIcon from "../components/HeartIcon";
import Modal from "../components/Modals";
import { Post } from "../tipe";


export default function RankPage() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([])

    useEffect(() => {
      async function getPosts() {
        const { data: posts } = await
        supabase.from('posts')
        .select('*')
        .gte('likes', 50)
        .order('likes', { ascending: false })

        if (posts) {
          setPosts(posts)
        }
      }

    getPosts()
  }, [])
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card-bg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Ranking
          </h1>
        </div>
      </header>

      {/* Grid de posts */}
      <main className="max-w-2xl mx-auto p-2">
        <div className="grid grid-cols-3 gap-1">
          {[...posts].sort((a, b) => b.likes - a.likes).map((post) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="relative aspect-square overflow-hidden group"
            >
              <Image
                src={post.image_url}
                alt={`Post con ${post.likes} likes`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              {/* Overlay con likes al hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <HeartIcon filled={true} />
                <span className="text-white font-semibold">
                  {post.likes.toLocaleString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Modal */}
      {selectedPost && (
        <Modal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}
