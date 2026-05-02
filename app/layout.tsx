import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fortune Box",
  description: "A magical box of your fortunes and links.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen relative selection:bg-amber-500/30">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
