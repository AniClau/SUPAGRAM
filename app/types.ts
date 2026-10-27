export interface Profile {
  username: string;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string | number;
  body: string;
  created_at: Date;
  profile?: Profile;
}

export interface Post {
  id: number | string;
  user_id: string;
  profile?: Profile;
  image_url: string;
  caption: string;
  likes_count: number;
  isLiked?: boolean;
  comments?: Comment[];
  created_at: Date;
  updated_at?: Date;
}

export interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onLike: (postId: number | string) => void;
  onComment: (postId: number | string, body: string) => void;
}