import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'

// 푸터는 사이트 전체를 거미줄로 묶는 자리다 — 어느 페이지에서든 인기 키워드 허브로
// 한 번에 갈 수 있게 한다. 키워드가 76종까지 늘어나므로 전부 깔지 않고 상위만 낸다.
const FOOTER_KEYWORD_LIMIT = 12

// layout.tsx의 헤더 내비와 같은 항목이지만, 푸터는 '관리'를 빼고 3개만 쓴다.
const FOOTER_NAV = [
  { href: '/#services', label: '수리 분야' },
  { href: '/#regions', label: '지역별 안내' },
  { href: '/#cases', label: '시공 기록' },
]

// layout.tsx는 동기 컴포넌트로 두고, DB가 필요한 푸터만 서버 컴포넌트로 분리했다.
// getAllData()는 React cache()라 같은 렌더에서 페이지와 조회를 공유한다.
export async function SiteFooter() {
  const { keywords, pages } = await getAllData()

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

  return (
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
          <nav
            className="flex flex-wrap gap-5 text-sm font-semibold text-[var(--ink-soft)]"
            aria-label="푸터 메뉴"
          >
            {FOOTER_NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-[var(--ink)]">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        {topKeywords.length > 0 && (
          <nav className="mt-8 border-t border-[var(--line)] pt-6" aria-label="주요 수리 항목">
            <p className="text-[13px] font-bold text-[var(--ink)]">많이 찾는 수리 항목</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold text-[var(--ink-soft)]">
              {topKeywords.map(({ keyword }) => (
                <Link
                  key={keyword.id}
                  href={`/${keyword.slug}`}
                  className="hover:text-[var(--copper)]"
                >
                  {keyword.display_name}
                </Link>
              ))}
              <Link href="/#services" className="font-bold text-[var(--teal)] hover:underline">
                전체 보기 →
              </Link>
            </div>
          </nav>
        )}

        <p className="mt-8 text-xs text-[var(--ink-soft)]">
          © 수리위키 (SuriWiki) · 지역별 집수리 시공 안내
        </p>
      </div>
    </footer>
  )
}
