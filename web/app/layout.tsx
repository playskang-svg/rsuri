import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from './_components/SiteFooter'
import { KeywordSearch, type SearchItem } from './_components/KeywordSearch'
import { getAllData, isPublished } from '@/lib/supabase'
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

// 상담 CTA는 카카오톡 채널로 보낸다. 외부 도메인이라 next/link가 아니라 <a>를 쓴다.
const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

// 헤더 검색용 색인. 서버가 없는 정적 사이트라 빌드 때 목록을 심어 두고 브라우저에서 거른다.
// 이름·슬러그·지역수만 담아 151개 기준 10KB 미만이다 — 레이아웃에 실어도 무겁지 않다.
async function searchIndex(): Promise<SearchItem[]> {
  const { keywords, pages } = await getAllData()
  const counts = new Map<number, number>()
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.repair_keyword_id) continue
    counts.set(p.repair_keyword_id, (counts.get(p.repair_keyword_id) ?? 0) + 1)
  }
  return keywords
    .map((k) => ({ slug: k.slug, name: k.display_name, regions: counts.get(k.id) ?? 0 }))
    .sort((a, b) => b.regions - a.regions || a.name.localeCompare(b.name, 'ko'))
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const items = await searchIndex()

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

            {/* 데스크톱 내비 — 검색이 자리를 먹으므로 좁은 화면에서는 lg부터 편다 */}
            <nav className="hidden items-center gap-5 lg:flex" aria-label="주요 메뉴">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="nav-link">
                  {n.label}
                </Link>
              ))}
            </nav>

            {/* 시공 이름 검색 — 항목이 151종이라 메뉴로는 못 찾는다 */}
            <KeywordSearch items={items} className="hidden min-w-0 flex-1 md:block md:max-w-xs" />

            <div className="flex flex-none items-center gap-2">
              <a
                href={KAKAO_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-call hidden !px-4 !py-2 text-sm sm:inline-flex"
              >
                빠른 상담하기
              </a>

              {/* 삼선 메뉴 — JS 없이 details로 동작.
                  데스크톱 내비가 lg부터 펴지므로 여기서도 lg까지는 남겨 둔다. */}
              <details className="menu-drop lg:hidden">
                <summary aria-label="메뉴 열기">
                  <span aria-hidden className="menu-bars">
                    <i />
                    <i />
                    <i />
                  </span>
                </summary>
                <nav className="menu-panel" aria-label="모바일 메뉴">
                  <KeywordSearch items={items} className="mb-2 md:hidden" />
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
