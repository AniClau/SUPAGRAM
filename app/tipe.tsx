export interface Profile {
  username: string;
  avatar_url: string | null;
}

export interface Post {
  id: number | string;
  user_id: string;
  profile?: Profile;
  image_url: string;
  caption: string;
  likes: number;
  isLiked: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface PostCardProps {
  post: Post;
  onLike: (id: number | string) => void;
}
