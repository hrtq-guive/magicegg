import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EggBox",
  description: "Put something inside. Decide how it will open. Send it.",
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
