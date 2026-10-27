"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/client";

interface Stats {
  users: number;
  posts: number;
  likes: number;
  comments: number;
}

interface RecentActivity {
  type: "post" | "like" | "comment";
  username: string;
  timestamp: Date;
  detail?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    posts: 0,
    likes: 0,
    comments: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Función para cargar estadísticas
  const fetchStats = async () => {
    const [usersRes, postsRes, likesRes, commentsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("likes").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      users: usersRes.count || 0,
      posts: postsRes.count || 0,
      likes: likesRes.count || 0,
      comments: commentsRes.count || 0,
    });
    setIsLoading(false);
  };

  // Función para agregar actividad reciente
  const addActivity = (activity: RecentActivity) => {
    setRecentActivity((prev) => [activity, ...prev].slice(0, 10));
  };

  // Cargar estadísticas iniciales
  useEffect(() => {
    fetchStats();
  }, []);

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    // Canal para posts
    const postsChannel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          setStats((prev) => ({ ...prev, posts: prev.posts + 1 }));
          
          // Obtener username del creador
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", payload.new.user_id)
            .single();

          addActivity({
            type: "post",
            username: profile?.username || "Usuario",
            timestamp: new Date(),
            detail: payload.new.caption?.substring(0, 50) || "Nuevo post",
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        () => {
          setStats((prev) => ({ ...prev, posts: Math.max(0, prev.posts - 1) }));
        }
      )
      .subscribe();

    // Canal para likes
    const likesChannel = supabase
      .channel("likes-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "likes" },
        async (payload) => {
          setStats((prev) => ({ ...prev, likes: prev.likes + 1 }));

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", payload.new.user_id)
            .single();

          addActivity({
            type: "like",
            username: profile?.username || "Usuario",
            timestamp: new Date(),
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "likes" },
        () => {
          setStats((prev) => ({ ...prev, likes: Math.max(0, prev.likes - 1) }));
        }
      )
      .subscribe();

    // Canal para comments
    const commentsChannel = supabase
      .channel("comments-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        async (payload) => {
          setStats((prev) => ({ ...prev, comments: prev.comments + 1 }));

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", payload.new.user_id)
            .single();

          addActivity({
            type: "comment",
            username: profile?.username || "Usuario",
            timestamp: new Date(),
            detail: payload.new.body?.substring(0, 50),
          });
        }
      )
      .subscribe();

    // Canal para profiles (usuarios)
    const profilesChannel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          setStats((prev) => ({ ...prev, users: prev.users + 1 }));

          addActivity({
            type: "post",
            username: payload.new.username || "Nuevo usuario",
            timestamp: new Date(),
            detail: "Se registró en la plataforma",
          });
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const statCards = [
    {
      label: "Usuarios",
      value: stats.users,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "Posts",
      value: stats.posts,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
      color: "from-purple-500 to-purple-600",
    },
    {
      label: "Likes",
      value: stats.likes,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
      color: "from-red-500 to-pink-500",
    },
    {
      label: "Comentarios",
      value: stats.comments,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
      color: "from-green-500 to-emerald-500",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "post":
        return "📸";
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      default:
        return "📌";
    }
  };

  const getActivityText = (activity: RecentActivity) => {
    switch (activity.type) {
      case "post":
        return activity.detail?.includes("registró") 
          ? activity.detail 
          : `publicó: "${activity.detail || "..."}"`;
      case "like":
        return "dio like a un post";
      case "comment":
        return `comentó: "${activity.detail || "..."}"`;
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card-bg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-foreground/60">En vivo</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-card-bg border border-border rounded-xl p-6 relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-linear-to-br ${card.color} opacity-5`}></div>
              <div className="relative">
                <div className={`inline-flex p-3 rounded-lg bg-linear-to-br ${card.color} text-white mb-4`}>
                  {card.icon}
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {isLoading ? (
                    <div className="h-9 w-16 bg-foreground/10 rounded animate-pulse"></div>
                  ) : (
                    card.value.toLocaleString()
                  )}
                </div>
                <div className="text-sm text-foreground/60">{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-card-bg border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Actividad Reciente
          </h2>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-foreground/50">
              <p>Esperando actividad en tiempo real...</p>
              <p className="text-sm mt-2">Las nuevas acciones aparecerán aquí automáticamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50 animate-fade-in"
                >
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">
                      <span className="font-semibold">@{activity.username}</span>{" "}
                      <span className="text-foreground/70">{getActivityText(activity)}</span>
                    </p>
                    <p className="text-xs text-foreground/50">
                      {activity.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}