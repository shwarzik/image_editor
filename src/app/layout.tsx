import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Editor",
  description: "Modern image editor with crop, pan and blur tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
