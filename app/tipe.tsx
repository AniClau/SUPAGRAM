export interface Post {
  id: number | string;
  user: {
    username: string;
    avatar: string;
  };
  image_url: string;
  caption: string;
  likes: number;
  isLiked: boolean;
  created_at: Date;
  updated_at?: Date;
}