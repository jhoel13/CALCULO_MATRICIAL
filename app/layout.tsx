import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laboratorio Matricial UNC",
  description: "Cuaderno interactivo para el análisis real de armaduras y pórticos 2D mediante el método matricial de rigidez.",
  authors: [{ name: "Jhoel Tocas Cercado" }],
  openGraph: {
    title: "Laboratorio Matricial UNC",
    description: "Modela, ensambla, resuelve y audita estructuras 2D paso a paso.",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
