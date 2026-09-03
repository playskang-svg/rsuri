import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from './_components/SiteFooter'
import './globals.css'

export const metadata: Metadata = {
  title: '수리위키 — 우리 동네 집수리',
  description:
    '누수·배수구·창호·전기·도배까지, 지역별 검증 마스터의 집수리 서비스. 사진 한 장이면 진단을 시작할 수 있습니다.',
}

// 해시만 쓰는 이유: 지역·허브·홈이 같은 id(cases/services/process/sitemap)를 쓰므로
// 어느 페이지에 있든 지금 보고 있는 문서의 해당 영역으로 스크롤된다.
// '/#...'로 두면 다른 페이지에서 누를 때 홈으로 튕겨 현재 맥락이 끊긴다.
const NAV = [
  { href: '/', label: '홈' },
  { href: '#cases', label: '시공사례' },
  { href: '#services', label: '서비스' },
  { href: '#process', label: '진행 과정' },
  { href: '#sitemap', label: '사이트맵' },
]

// 상담 CTA는 카카오톡 채널로 보낸다. 외부 도메인이라 next/link가 아니라 <a>를 쓴다.
const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;800;900&family=Noto+Sans+KR:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/92 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink)] text-[var(--paper)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M14.5 6.5a4 4 0 0 0-5.6 4.9L4 16.3V20h3.7l4.9-4.9a4 4 0 0 0 4.9-5.6l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-serif-kr text-xl font-black tracking-tight">수리위키</span>
            </Link>

            {/* 데스크톱 내비 */}
            <nav className="hidden items-center gap-6 md:flex" aria-label="주요 메뉴">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="nav-link">
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={KAKAO_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-call hidden !px-4 !py-2 text-sm sm:inline-flex"
              >
                빠른 상담하기
              </a>

              {/* 삼선 메뉴 — JS 없이 details로 동작 */}
              <details className="menu-drop md:hidden">
                <summary aria-label="메뉴 열기">
                  <span aria-hidden className="menu-bars">
                    <i />
                    <i />
                    <i />
                  </span>
                </summary>
                <nav className="menu-panel" aria-label="모바일 메뉴">
                  {NAV.map((n) => (
                    <Link key={n.href} href={n.href}>
                      {n.label}
                    </Link>
                  ))}
                  <a
                    href={KAKAO_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-call mt-2 !py-2.5 text-sm"
                  >
                    빠른 상담하기
                  </a>
                </nav>
              </details>
            </div>
          </div>
        </header>

        {children}

        <SiteFooter />
      </body>
    </html>
  )
}
