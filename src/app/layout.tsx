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

// (수정!) 웹사이트의 제목과 설명을 변경합니다.
export const metadata: Metadata = {
  title: "오늘 뭐 먹지? - 식사 메뉴 추천기",
  description: "사용자 위치 기반 식사 메뉴 추천 및 룰렛 앱",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // (수정!) 웹페이지의 기본 언어를 한국어로 설정합니다.
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

