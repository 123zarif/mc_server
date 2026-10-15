import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SERVER_NAME || 'Minecraft Server Network',
  description: 'High-performance Management Dashboard for Minecraft Server Network',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-background text-text-main antialiased selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}

