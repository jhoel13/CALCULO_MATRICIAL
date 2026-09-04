import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laboratorio Matricial UNC · Concreto",
  description: "Análisis de armaduras y pórticos 2D por rigidez, conectado con aplicaciones de concreto armado y hojas Mathcad.",
  authors: [{ name: "Jhoel Tocas Cercado" }],
  openGraph: {
    title: "Laboratorio Matricial UNC · Concreto",
    description: "Modela, ensambla y vincula el cálculo matricial con aplicaciones de concreto estructural.",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  verification: {
    google: "y2Mdgu3JVPqrLL054jbcS1LYSbZT3WkGUDzurnz-hv8",
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
