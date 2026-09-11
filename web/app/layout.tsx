import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from './_components/SiteFooter'
import { CtaBand } from './_components/CtaBand'
import { KeywordSearch, type SearchItem } from './_components/KeywordSearch'
import { getAllData, isPublished } from '@/lib/supabase'
import './globals.css'

export const metadata: Metadata = {
  title: '수리위키 — 우리 동네 집수리',
  description:
    '누수·배수구·창호·전기·도배까지, 지역별 검증 마스터의 집수리 서비스. 사진 한 장이면 진단을 시작할 수 있습니다.',
  verification: {
    google: 'eOG92jGwvKx_XpUBPUbTfmSsdop0Py2RlLfasfobFcU',
    other: {
      'naver-site-verification': '9004a322fa5ed99f5e2fe01e0297d22c2a5e6e08',
    },
  },
}

// 해시만 쓰는 이유: 지역·허브·홈이 같은 id(cases/services/process)를 쓰므로
// 어느 페이지에 있든 지금 보고 있는 문서의 해당 영역으로 스크롤된다.
// '/#...'로 두면 다른 페이지에서 누를 때 홈으로 튕겨 현재 맥락이 끊긴다.
const NAV = [
  { href: '/', label: '홈' },
  { href: '#cases', label: '시공사례' },
  { href: '#services', label: '서비스' },
  { href: '#process', label: '진행 과정' },
  // 사이트맵만 실제 페이지다. 해시(#sitemap)는 지역 페이지에만 있는 섹션이라
  // 홈·허브에서 누르면 아무 데도 가지 않았다 — 전 페이지 색인을 /sitemap에 세웠다.
  { href: '/sitemap', label: '사이트맵' },
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
        {/* 화면에서 실제로 쓰는 굵기만 받는다.
            본문·제목(Noto Sans KR): 400~900 — 제목은 참고 스킨처럼 900을 좁은 자간으로 쌓는다.
            모노 라벨(IBM Plex Mono): 500·600 — "FREQUENTLY ASKED" 같은 영문 표식 전용.
            명조(Noto Serif KR)는 참고 스킨 전환으로 쓰지 않아 뺐다. */}
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* 상단 유틸바 — 참고 스킨의 어두운 얇은 띠. 모바일은 44px 터치 영역을 못 채워 숨기고 삼선 메뉴가 대신한다 */}
        <div className="util-bar hidden sm:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <p className="hidden truncate py-2 sm:block">우리 동네 집수리 · 사진 한 장으로 진단을 시작합니다</p>
            <nav className="flex items-center gap-4" aria-label="바로가기">
              <Link href="/sitemap">사이트맵</Link>
              <a href="#cases">시공사례</a>
              <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                상담
              </a>
            </nav>
          </div>
        </div>

        <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
          <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span aria-hidden className="logo-mark">
                <i />
                <i />
                <i />
              </span>
              <span className="leading-none">
                <span className="block text-[1.35rem] font-black tracking-[-0.05em]">수리위키</span>
                <span className="mt-1 block text-[10px] font-bold tracking-[0.3em] text-[var(--ink-soft)]">
                  집수리연구소
                </span>
              </span>
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

        <CtaBand />
        <SiteFooter />
      </body>
    </html>
  )
}
