import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: '수리위키 — 우리 동네 집수리',
  description:
    '누수·배수구·창호·전기·도배까지, 지역별 검증 마스터의 집수리 서비스. 사진 한 장이면 진단을 시작할 수 있습니다.',
}

const NAV = [
  { href: '/#services', label: '수리 분야' },
  { href: '/#regions', label: '지역별 안내' },
  { href: '/#cases', label: '시공 기록' },
  { href: '/admin', label: '관리' },
]

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
              <Link href="/#services" className="btn-call hidden !px-4 !py-2 text-sm sm:inline-flex">
                사진 상담
              </Link>

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
                  <Link href="/#services" className="btn-call mt-2 !py-2.5 text-sm">
                    사진 상담
                  </Link>
                </nav>
              </details>
            </div>
          </div>
        </header>

        {children}

        <footer className="mt-20 border-t border-[var(--line)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="font-serif-kr text-lg font-black">수리위키</p>
                <p className="mt-1 max-w-md text-sm text-[var(--ink-soft)]">
                  작업 중에는 통화가 어려우니 사진과 지역, 수리 내용을 남겨 주시면 확인 후
                  안내드립니다.
                </p>
              </div>
              <nav className="flex flex-wrap gap-5 text-sm font-semibold text-[var(--ink-soft)]" aria-label="푸터 메뉴">
                {NAV.slice(0, 3).map((n) => (
                  <Link key={n.href} href={n.href} className="hover:text-[var(--ink)]">
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
            <p className="mt-8 text-xs text-[var(--ink-soft)]">
              © 수리위키 (SuriWiki) · 지역별 집수리 시공 안내
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
