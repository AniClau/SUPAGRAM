import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gurzhkwijuqprdeklcef.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cnpoa3dpanVxcHJkZWtsY2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjIyNjksImV4cCI6MjEwNTIzODI2OX0.Gv5G9Wvb6rIrKF0gAWVtwXiX29RHTXqwotpn53ICdaU";

export const supabase = createClient(supabaseUrl, supabaseKey);
