import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { fallbackPhone, telHrefOf } from '@/lib/contact'
import { loadSiteData } from '@/lib/site-data'

// 푸터는 사이트 전체를 거미줄로 묶는 자리 — 어느 페이지에서든 인기 허브로 한 번에 간다.
// 4열(로고+소개 / 바로가기 / 많이 찾는 수리 / 고객지원), 모바일 2→1열. 링크 데이터는 그대로.
const FOOTER_KEYWORD_LIMIT = 12

// 헤더 내비와 같은 앵커. 해시만 쓰는 이유는 layout.tsx의 NAV 주석 참고.
const FOOTER_NAV = [
  { href: '#cases', label: '시공사례' },
  { href: '#services', label: '서비스' },
  { href: '#process', label: '진행 과정' },
  { href: '/sitemap', label: '사이트맵' },
]

export async function SiteFooter() {
  const { keywords, pages, localPros } = await getAllData()

  const countByKeyword = new Map<number, number>()
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.repair_keyword_id || !p.region_id) continue
    countByKeyword.set(p.repair_keyword_id, (countByKeyword.get(p.repair_keyword_id) ?? 0) + 1)
  }

  const topKeywords = [...keywords]
    .map((k) => ({ keyword: k, count: countByKeyword.get(k.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.keyword.display_name.localeCompare(b.keyword.display_name, 'ko'))
    .slice(0, FOOTER_KEYWORD_LIMIT)

  const phone = fallbackPhone(localPros) ?? loadSiteData().site.phone
  const telHref = telHrefOf(phone)

  return (
    <footer className="site-foot">
      <div className="wrap py-14">
        <div className="foot-grid">
          {/* 브랜드 */}
          <div className="on-dark">
            <p className="logo">
              <b className="text-[var(--on-ink)]">수리위키</b>
              <small className="!text-[var(--on-ink-soft)]">집수리 안내</small>
            </p>
            <p className="mt-4 max-w-sm leading-relaxed">
              지역별 집수리 시공 안내. 작업 중에는 통화가 어려우니 사진과 지역, 수리 내용을 남겨 주시면 확인 후
              안내드립니다.
            </p>
          </div>

          <nav aria-label="푸터 메뉴">
            <h3>바로가기</h3>
            <ul className="mt-3">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center">
                  홈
                </Link>
              </li>
              {FOOTER_NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="inline-flex min-h-11 items-center">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {topKeywords.length > 0 && (
            <nav aria-label="주요 수리 항목">
              <h3>많이 찾는 수리</h3>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 lg:grid-cols-1">
                {topKeywords.map(({ keyword }) => (
                  <li key={keyword.id}>
                    <Link href={`/${keyword.slug}`} className="inline-flex min-h-11 items-center">
                      {keyword.display_name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/#services" className="inline-flex min-h-11 items-center font-bold text-[var(--gold)]">
                    전체 보기 →
                  </Link>
                </li>
              </ul>
            </nav>
          )}

          <div>
            <h3>고객지원</h3>
            <ul className="mt-3">
              {phone && (
                <li>
                  <a href={telHref} className="inline-flex min-h-11 items-center font-bold text-[var(--gold)]">
                    {phone}
                  </a>
                </li>
              )}
              <li className="flex min-h-11 items-center">사진·문자 상담 환영</li>
              <li>
                <Link href="/sitemap" className="inline-flex min-h-11 items-center">
                  전체 안내 색인
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <nav aria-label="함께 보면 좋은 정보" className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="label-mono !text-[var(--on-ink)]">함께 보면 좋은 정보</span>
          <a href="https://isatips.adbles.com/" className="inline-flex min-h-11 items-center">이사팁스 · 이사·입주 준비</a>
          <a href="https://gajun.kr/" className="inline-flex min-h-11 items-center">가전비교연구소 · 가전 고르기</a>
          <a href="https://tipspedia.kr/" className="inline-flex min-h-11 items-center">팁스피디아 · 생활꿀팁</a>
        </nav>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-dark)] pt-6 text-xs">
          <p>수리위키 · 지역별 집수리 안내 · 표시광고법·전자상거래법 준수</p>
          <p className="label-mono !text-[var(--on-ink-soft)]">© 2026 수리위키</p>
        </div>
      </div>
    </footer>
  )
}
