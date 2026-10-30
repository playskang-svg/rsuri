import type { Metadata } from 'next'
import Script from 'next/script'
import { SiteFooter } from './_components/SiteFooter'
import { SiteHeader } from './_components/SiteHeader'
import { CtaBand } from './_components/CtaBand'
import { MobileConsultBar } from './_components/MobileConsultBar'
import { Reveal } from './_components/Reveal'
import { type SearchItem } from './_components/KeywordSearch'
import { getAllData, isPublished } from '@/lib/supabase'
import { loadSiteData } from '@/lib/site-data'
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
  // 사이트맵만 실제 페이지다 — 전 페이지 색인.
  { href: '/sitemap', label: '사이트맵' },
]

// 헤더 검색용 색인. 서버가 없는 정적 사이트라 빌드 때 목록을 심어 두고 브라우저에서 거른다.
async function searchIndex(): Promise<SearchItem[]> {
  const { keywords, pages } = await getAllData()
  const counts = new Map<number, number>()
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.repair_keyword_id) continue
    counts.set(p.repair_keyword_id, (counts.get(p.repair_keyword_id) ?? 0) + 1)
  }
  // 허브로 합친 보조 키워드(예: 강마루보수업체)도 검색되게 같은 주소로 한 줄씩 더 싣는다.
  return keywords
    .flatMap((k) => {
      const regions = counts.get(k.id) ?? 0
      return [k.display_name, ...(k.aliases ?? [])].map((name) => ({ slug: k.slug, name, regions }))
    })
    .sort((a, b) => b.regions - a.regions || a.name.localeCompare(b.name, 'ko'))
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const items = await searchIndex()
  const phone = loadSiteData().site.phone

  return (
    <html lang="ko">
      <head>
        {/* 스크롤 등장 효과의 게이트. 이 클래스가 붙은 뒤에만 초기 숨김이 걸린다 —
            크롤러·JS 실패 시에는 전부 보인다. 반드시 CSS보다 먼저, 동기로 실행된다. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('has-js')" }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* 글꼴은 Pretendard 하나로 통일(2026-10-30 — 세리프 제목·모노 라벨이 무겁고 낡아 보인다는 운영자 의견).
            dynamic-subset은 화면에 나온 글자 조각만 받아 한글 웹폰트치고 가볍다. */}
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-ZJMBS6B7YX" strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{"window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-ZJMBS6B7YX');gtag('config','G-8Z973M22LF');"}</Script>

        <SiteHeader nav={NAV} phone={phone} searchItems={items} />

        {children}

        <CtaBand phone={phone} />
        <SiteFooter />
        <MobileConsultBar phone={phone} />
        <Reveal />
      </body>
    </html>
  )
}
