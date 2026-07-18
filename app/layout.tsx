import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Control de flota',
  description: 'Control de vehículos, documentos, mantenimientos y órdenes de trabajo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text font-sans min-h-screen">{children}</body>
    </html>
  );
}
