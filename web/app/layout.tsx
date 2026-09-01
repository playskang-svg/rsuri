import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: '수리위키 — 대한민국 집수리 표준 가이드',
  description:
    '지역별 실제 시공 기록으로 정리한 집수리 표준 가이드. 증상 진단부터 시공 절차, 재발 방지까지 검증 마스터의 현장 노하우를 담았습니다.',
}

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
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              {/* 로고: 렌치 단면을 단순화한 마크 */}
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

            <nav className="hidden items-center gap-6 sm:flex" aria-label="주요 메뉴">
              <Link href="/#services" className="nav-link">
                수리 분야
              </Link>
              <Link href="/#regions" className="nav-link">
                지역별 가이드
              </Link>
              <Link href="/#cases" className="nav-link">
                시공 기록
              </Link>
            </nav>

            <Link href="/#services" className="btn-call !px-4 !py-2 text-sm">
              사진 상담
            </Link>
          </div>
        </header>

        {children}

        <footer className="mt-20 border-t border-[var(--line)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="font-serif-kr text-lg font-black">수리위키</p>
                <p className="mt-1 max-w-md text-sm text-[var(--ink-soft)]">
                  지역별 실제 시공 기록으로 정리한 집수리 표준 가이드. 작업 중에는 통화가
                  어려우니 사진과 지역, 수리 내용을 남겨 주시면 확인 후 안내드립니다.
                </p>
              </div>
              <nav className="flex gap-5 text-sm font-semibold text-[var(--ink-soft)]" aria-label="푸터 메뉴">
                <Link href="/#services" className="hover:text-[var(--ink)]">
                  수리 분야
                </Link>
                <Link href="/#regions" className="hover:text-[var(--ink)]">
                  지역별
                </Link>
                <Link href="/#cases" className="hover:text-[var(--ink)]">
                  시공 기록
                </Link>
              </nav>
            </div>
            <p className="mt-8 text-xs text-[var(--ink-soft)]">
              © 수리위키 (SuriWiki) · 본 가이드는 실제 시공 사례를 바탕으로 작성되었습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
