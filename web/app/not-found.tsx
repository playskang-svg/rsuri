import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { KeywordSearch, type SearchItem } from '@/app/_components/KeywordSearch'
import type { Page, RepairKeyword } from '@/lib/types'

// 없는 주소로 들어온 방문자를 바로 잇는다 — 시공 이름 검색, 수리 분야, 홈.

const pad2 = (n: number) => String(n).padStart(2, '0')

// 검색 색인 — layout.tsx의 searchIndex와 같은 계산. 레이아웃이 만든 목록을 페이지가 받을 길이 없어 여기서 다시 만든다.
// (getAllData는 cache로 감싸 있어 데이터를 두 번 읽지 않는다)
function searchItems(keywords: RepairKeyword[], pages: Page[]): SearchItem[] {
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

export default async function NotFound() {
  const { categories, keywords, pages } = await getAllData()
  const items = searchItems(keywords, pages)

  const itemCountByCategory = new Map<number, number>()
  for (const k of keywords) itemCountByCategory.set(k.category_id, (itemCountByCategory.get(k.category_id) ?? 0) + 1)
  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <main className="section-y">
      <div className="wrap">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-16">
          <div className="min-w-0 lg:col-span-7" data-reveal="stagger">
            <p className="label-mono" style={{ ['--i' as string]: 0 }}>
              404 · 페이지 없음
            </p>
            <h1 className="t-display mt-4" style={{ ['--i' as string]: 1 }}>
              페이지를 찾을 수 없습니다
            </h1>
            <p className="t-lead mt-5 text-[var(--ink-soft)]" style={{ ['--i' as string]: 2 }}>
              주소를 다시 확인해 주세요. 시공 이름으로 찾거나 수리 분야에서 고를 수 있습니다.
            </p>
            {/* 헤더 검색과 같은 컴포넌트. 여기서는 본문 크기라 입력칸을 48px·16px로 키운다
                (16px 미만이면 iOS가 포커스 때 화면을 확대한다). 전역 .search-input을 이기려고 !important. */}
            <div className="mt-8 max-w-md" style={{ ['--i' as string]: 3 }}>
              <p className="label-mono mb-3">시공 이름으로 찾기</p>
              <div className="[&_.search-input]:min-h-12! [&_.search-input]:text-base!">
                <KeywordSearch items={items} />
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap" style={{ ['--i' as string]: 4 }}>
              <Link href="/" className="btn-ghost">
                홈으로 돌아가기
              </Link>
              <Link href="/sitemap" className="btn-ghost">
                사이트맵 보기
              </Link>
            </div>
          </div>

          <nav aria-labelledby="nf-categories" className="panel min-w-0 px-5 pb-3 pt-5 lg:col-span-5 lg:px-7" data-reveal="up">
            <p id="nf-categories" className="label-mono">
              수리 분야 {sortedCategories.length}개
            </p>
            <ul className="mt-3 border-t border-[var(--ink)]">
              {sortedCategories.map((c, i) => {
                const count = itemCountByCategory.get(c.id) ?? 0
                return (
                  <li key={c.id} className="border-b border-[var(--line)] last:border-b-0">
                    <Link
                      href={`/category/${c.slug}`}
                      className="flex min-h-11 items-center gap-4 px-1 py-2 transition-colors hover:text-[var(--copper)]"
                    >
                      <span className="label-mono w-6 flex-none !text-[var(--copper)]" aria-hidden>
                        {pad2(i + 1)}
                      </span>
                      <span className="min-w-0 flex-1 font-medium [word-break:keep-all]">{c.display_name}</span>
                      {count > 0 && <span className="label-mono flex-none">항목 {count}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </div>
    </main>
  )
}
