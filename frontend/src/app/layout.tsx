import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ALPC — Adaptive Learning Pathway Compiler',
  description: 'A unified platform combining LearnSmart AI adaptive learning with ALPC compiler technology. Path-Lang → Flex → Bison → AST → LLVM IR → Personalized Learning.',
  keywords: ['adaptive learning', 'compiler', 'LLVM IR', 'Path-Lang', 'DSA', 'AI learning', 'ALPC'],
  openGraph: {
    title: 'ALPC — Adaptive Learning Pathway Compiler',
    description: 'Compiler-powered adaptive learning platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen antialiased`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('ls-theme');
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                  document.body.classList.add('light');
                }
              } catch(e) {}
            `,
          }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
