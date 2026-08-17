import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevDocs AI Assistant",
  description: "Ask questions about your technical documentation using AI",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="font-sans h-full bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
