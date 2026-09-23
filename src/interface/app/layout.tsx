import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CouchSync - 10-Foot Smart TV Interface",
  description: "AI-powered living room entertainment system that ends group decision paralysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#08090d] text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
