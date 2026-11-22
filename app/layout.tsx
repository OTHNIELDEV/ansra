import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ANSRA(가칭) — AI 검색 노출·귀속 플랫폼',
  description: 'AI 검색에서 브랜드가 추천되는 빈도를 재고, 문의로 이어졌는지까지 확인하는 플랫폼의 초기 버전입니다.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
