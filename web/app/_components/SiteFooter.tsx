import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { fallbackPhone, telHrefOf } from '@/lib/contact'

// 푸터는 사이트 전체를 거미줄로 묶는 자리다 — 어느 페이지에서든 인기 키워드 허브로
// 한 번에 갈 수 있게 한다. 키워드가 200종이 넘으므로 전부 깔지 않고 상위만 낸다.
const FOOTER_KEYWORD_LIMIT = 12

// 헤더 내비와 같은 앵커. 해시만 쓰는 이유는 layout.tsx의 NAV 주석 참고.
const FOOTER_NAV = [
  { href: '#cases', label: '시공사례' },
  { href: '#services', label: '서비스' },
  { href: '#process', label: '진행 과정' },
  { href: '#sitemap', label: '사이트맵' },
]

// layout.tsx는 동기 컴포넌트로 두고, DB가 필요한 푸터만 서버 컴포넌트로 분리했다.
// getAllData()는 React cache()라 같은 렌더에서 페이지와 조회를 공유한다.
export async function SiteFooter() {
  const { keywords, pages, localPros } = await getAllData()

  const countByKeyword = new Map<number, number>()
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.repair_keyword_id || !p.region_id) continue
    countByKeyword.set(p.repair_keyword_id, (countByKeyword.get(p.repair_keyword_id) ?? 0) + 1)
  }

  const topKeywords = [...keywords]
    .map((k) => ({ keyword: k, count: countByKeyword.get(k.id) ?? 0 }))
    .sort(
      (a, b) =>
        b.count - a.count || a.keyword.display_name.localeCompare(b.keyword.display_name, 'ko'),
    )
    .slice(0, FOOTER_KEYWORD_LIMIT)

  const phone = fallbackPhone(localPros)
  const telHref = telHrefOf(phone)

  return (
    <footer className="bg-[var(--ink)] text-[#aeb9be]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* 브랜드 */}
          <div>
            <p className="font-serif-kr text-xl font-black text-white">수리위키</p>
            <p className="mt-1 text-[11px] font-bold tracking-[0.22em] text-[#e8b34c]">
              S U R I · W I K I
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              지역별 집수리 시공 안내. 작업 중에는 통화가 어려우니 사진과 지역, 수리 내용을
              남겨 주시면 확인 후 안내드립니다.
            </p>
          </div>

          {/* 바로가기 */}
          <nav aria-label="푸터 메뉴">
            <p className="text-sm font-extrabold text-[#e8b34c]">바로가기</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white">
                  홈
                </Link>
              </li>
              {FOOTER_NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="hover:text-white">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 연락처 */}
          <div>
            <p className="text-sm font-extrabold text-[#e8b34c]">연락처</p>
            {phone && (
              <p className="mt-4 text-xl font-black text-[#e8b34c]">
                <a href={telHref} className="hover:underline">
                  {phone}
                </a>
              </p>
            )}
            <p className="mt-3 text-sm">사진·문자 상담 환영</p>
            {telHref && (
              <a
                href={telHref}
                className="mt-5 inline-flex items-center rounded-full border border-[#e8b34c] px-5 py-2.5 text-sm font-extrabold text-[#e8b34c] hover:bg-[#e8b34c] hover:text-[var(--ink)]"
              >
                상담문의 →
              </a>
            )}
          </div>
        </div>

        {topKeywords.length > 0 && (
          <nav className="mt-12 border-t border-white/10 pt-8" aria-label="주요 수리 항목">
            <p className="text-[13px] font-extrabold text-white">많이 찾는 수리 항목</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
              {topKeywords.map(({ keyword }) => (
                <Link key={keyword.id} href={`/${keyword.slug}`} className="hover:text-[#e8b34c]">
                  {keyword.display_name}
                </Link>
              ))}
              <Link href="/#services" className="font-bold text-[#e8b34c] hover:underline">
                전체 보기 →
              </Link>
            </div>
          </nav>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs">
          <p>© 2026 수리위키 (SuriWiki). All rights reserved.</p>
          <p>표시광고법 · 전자상거래법 준수</p>
        </div>
      </div>
    </footer>
  )
}
