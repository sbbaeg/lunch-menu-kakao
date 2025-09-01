import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// (수정!) Open Graph 메타데이터를 추가합니다.
export const metadata: Metadata = {
  title: "오늘 뭐 먹지? - 식사 메뉴 추천기",
  description: "사용자 위치 기반 식사 메뉴 추천 및 룰렛 앱",
  icons: {
    icon: "/icon.png",
  },
  // (추가!) 링크 공유 시 표시될 정보 (Open Graph)
  openGraph: {
    title: "오늘 뭐 먹지? - 식사 메뉴 추천기",
    description: "내 주변 맛집, 룰렛으로 결정하세요!",
    // (중요!) og:image에는 웹사이트의 전체 주소가 포함되어야 합니다.
    images: [
      {
        url: "https://lunch-menu-kakao.vercel.app/icon.png", // Vercel 배포 주소 + 아이콘 경로
        width: 256,
        height: 256,
        alt: "오늘 뭐 먹지? 로고",
      },
    ],
    type: "website",
    url: "https://lunch-menu-kakao.vercel.app", // 웹사이트 대표 주소
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

