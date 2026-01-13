import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farzad AI - Independent Thinker's Assistant",
  description:
    "Ask anything about technology, AI, Tesla, markets, or building - I'll break it down with first-principles thinking and real-world context.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
