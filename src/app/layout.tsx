import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rentry – Anonymous Text & File Sharing",
  description:
    "Create anonymous clipboard pages. Save text, markdown, and files — no account needed. Share via link, protect with a password, and set an expiration.",
  keywords: ["paste", "clipboard", "anonymous", "file sharing", "markdown"],
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-black text-white antialiased min-h-screen">{children}</body>
    </html>
  );
}
