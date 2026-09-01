import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'

export default async function HomePage() {
  const { categories, keywords, pages, regions } = await getAllData()
  const { byId } = buildRegionIndex(regions)

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const keywordById = new Map(keywords.map((k) => [k.id, k]))

  const landings = pages
    .filter((p) => p.page_type === 'LANDING' && isPublished(p) && p.region_id && p.repair_keyword_id)
    .map((p) => {
      const chain = getAncestorChain(p.region_id!, byId)
      const kw = keywordById.get(p.repair_keyword_id!)
      const cat = kw ? categoryById.get(kw.category_id) : undefined
      return { page: p, chain, kw, cat }
    })
    .filter((x) => x.kw && x.chain.length > 0)

  const cases = pages.filter((p) => p.page_type === 'CASE' && isPublished(p) && p.slug)
  const caseByKeyword = new Map(cases.map((c) => [c.repair_keyword_id, c]))

  const publishedKeywordIds = new Set(landings.map((x) => x.kw!.id))
  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <main>
      {/* ── 히어로 ── */}
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="eyebrow">지역 × 공종 시공 기록 아카이브</p>
            <h1 className="font-serif-kr mt-3 text-4xl font-black leading-[1.2] sm:text-5xl">
              고치기 전에,
              <br />
              우리 동네 시공 기록부터.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] text-[var(--ink-soft)]">
              수리위키는 실제 현장에서 무엇을 보고, 어떻게 판단하고, 어떤 순서로 작업했는지를
              동네 단위로 기록합니다. 증상 진단 → 표준 공정 → 재발 방지까지, 검증 마스터의
              작업 기준을 그대로 옮겼습니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#services" className="btn-call">
                내 증상으로 찾기
              </a>
              <a href="#cases" className="btn-ghost">
                시공 기록 보기
              </a>
            </div>
            <p className="mt-6 text-[13px] text-[var(--ink-soft)]">
              <span className="font-bold text-[var(--copper)]">안내</span> 작업 중에는 전화
              연결이 어렵습니다. 사진과 지역·수리 내용을 남겨 주시면 확인 후 안내드립니다.
            </p>
          </div>

          {/* 발행 지역 미니 색인 — 위키다움을 보여주는 우측 카드 */}
          <div className="diag-card rounded-2xl p-6" id="regions">
            <p className="eyebrow">현재 발행된 지역 가이드</p>
            <ul className="mt-4 space-y-2.5">
              {landings.map(({ page, chain, kw }) => {
                const path = chain.map((r) => r.slug).join('/')
                const dong = chain[chain.length - 1]
                return (
                  <li key={page.id}>
                    <Link
                      href={`/${kw!.slug}/${path}`}
                      className="group flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--teal-soft)]"
                    >
                      <span className="font-bold">
                        {dong.display_name}{' '}
                        <span className="font-semibold text-[var(--ink-soft)] group-hover:text-[var(--ink)]">
                          {kw!.display_name}
                        </span>
                      </span>
                      <span aria-hidden className="text-[var(--copper)]">
                        →
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--ink-soft)]">
              시공 기록이 검수되는 대로 지역이 추가됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── 수리 분야 ── */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="eyebrow">Services</p>
        <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-3xl">수리 분야별 가이드</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          증상이 속한 공종을 고르면 해당 분야의 지역 가이드로 이동합니다.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedCategories.map((category) => {
            const kws = keywords
              .filter((k) => k.category_id === category.id)
              .sort((a, b) => a.menu_order - b.menu_order)
            const liveCount = kws.filter((k) => publishedKeywordIds.has(k.id)).length
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="card group relative overflow-hidden p-5 transition-shadow hover:shadow-lg"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.13] transition-opacity group-hover:opacity-25"
                  style={{ backgroundImage: blueprintBg(category.slug, category.slug) }}
                />
                <div className="relative">
                  <h3 className="text-lg font-extrabold">{category.display_name}</h3>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    가이드 {kws.length}종
                    {liveCount > 0 && (
                      <span className="ml-2 rounded-full bg-[var(--teal-soft)] px-2 py-0.5 text-xs font-bold text-[var(--teal)]">
                        발행 {liveCount}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── 시공 기록 ── */}
      <section id="cases" className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="eyebrow">Field Records</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-3xl">실제 시공 기록</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            문제 → 판단 → 작업 → 검측 결과까지, 현장에서 실제로 진행된 순서 그대로.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {landings.map(({ page, chain, kw, cat }) => {
              const casePage = caseByKeyword.get(kw!.id)
              if (!casePage?.slug) return null
              const dong = chain[chain.length - 1]
              return (
                <Link
                  key={casePage.id}
                  href={`/case/${casePage.slug}`}
                  className="card group flex items-start justify-between gap-4 p-5 transition-shadow hover:shadow-lg"
                >
                  <div>
                    <p className="text-xs font-bold text-[var(--teal)]">
                      {cat?.display_name} · {dong.display_name}
                    </p>
                    <h3 className="mt-1.5 font-extrabold leading-snug">{casePage.meta_title}</h3>
                    <p className="mt-2 text-sm text-[var(--ink-soft)] line-clamp-2">
                      {page.guide?.summary}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--line)] text-[var(--copper)] transition-colors group-hover:border-[var(--copper)]"
                  >
                    →
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
