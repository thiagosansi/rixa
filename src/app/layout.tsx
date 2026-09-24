import type { Metadata, Viewport } from 'next';
import { Anton, Inter } from 'next/font/google';
import './globals.css';

const display = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display-src',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body-src',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RIXA',
  description: 'Jogos de sala para jogar com os celulares. A TV é opcional.',
  applicationName: 'RIXA',
};

export const viewport: Viewport = {
  themeColor: '#0a0710',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body className="arena-bg antialiased">{children}</body>
    </html>
  );
}
