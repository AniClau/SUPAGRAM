import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./components/BottomNav";

export const metadata: Metadata = {
  title: "Suplatzigram",
  description: "App inspirada en Instagram - Curso de Supabase de Platzi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="pb-20">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
