import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { categoryPhoto } from '@/lib/photos'

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

  // 풍부한 콘텐츠(guide)가 있는 조합을 대표로 노출
  const featured = landings.filter((x) => x.page.guide)
  const cases = pages.filter((p) => p.page_type === 'CASE' && isPublished(p) && p.slug)
  const caseByKey = new Map(cases.map((c) => [`${c.repair_keyword_id}:${c.region_id}`, c]))

  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const heroPhoto = categoryPhoto('leak-waterproof', 'home-hero')

  // 지역 색인: 동별로 발행 키워드 수 집계
  const dongStats = new Map<number, { dong: string; upper: string; count: number; href: string }>()
  for (const { page, chain, kw } of landings) {
    const dong = chain[chain.length - 1]
    const cur = dongStats.get(dong.id)
    if (cur) cur.count += 1
    else
      dongStats.set(dong.id, {
        dong: dong.display_name,
        upper: chain.slice(0, -1).map((r) => r.display_name).join(' '),
        count: 1,
        href: `/${kw!.slug}/${chain.map((r) => r.slug).join('/')}`,
      })
  }

  return (
    <main>
      {/* ── 히어로: 서비스 직접 소구 + 큰 사진 ── */}
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-16">
          <div>
            <p className="eyebrow">우리 동네 집수리</p>
            <h1 className="font-serif-kr mt-3 text-[2rem] font-black leading-[1.25] sm:text-5xl">
              새는 곳, 막힌 곳, 삭은 곳.
              <br />
              상한 곳만 정확히 잡습니다.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] text-[var(--ink-soft)] sm:text-base">
              싱크대 누수, 화장실 악취, 뻑뻑한 샷시, 내려가는 차단기, 곰팡이 도배까지 —
              동네 담당 마스터가 진단부터 마감까지 한 번에 처리합니다. 사진 한 장이면
              진단을 시작할 수 있어요.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#services" className="btn-call">
                수리 분야 보기
              </a>
              <a href="#cases" className="btn-ghost">
                시공 기록 보기
              </a>
            </div>
            <p className="mt-5 text-[13px] text-[var(--ink-soft)]">
              <span className="font-bold text-[var(--copper)]">안내</span> 작업 중에는 전화
              연결이 어렵습니다. 사진과 지역·수리 내용을 남겨 주시면 확인 후 안내드립니다.
            </p>
          </div>

          <div className="hero-photo aspect-[4/3] lg:aspect-[5/4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroPhoto.src} alt="배관 점검 작업" style={heroPhoto.style} loading="eager" />
            <span className="tag">참고 이미지</span>
          </div>
        </div>
      </section>

      {/* ── 수리 분야 (사진 카드) ── */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="eyebrow">Services</p>
        <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-3xl">수리 분야</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          분야를 고르면 지역별 안내 페이지로 이동합니다.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedCategories.map((category) => {
            const kws = keywords
              .filter((k) => k.category_id === category.id)
              .sort((a, b) => a.menu_order - b.menu_order)
            const photo = categoryPhoto(category.slug, category.slug)
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="card group overflow-hidden transition-shadow hover:shadow-xl"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt=""
                    style={photo.style}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <h3 className="text-lg font-extrabold">{category.display_name}</h3>
                    <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">
                      {kws
                        .slice(0, 2)
                        .map((k) => k.display_name.split(' ')[0])
                        .join(' · ')}{' '}
                      외 {Math.max(kws.length - 2, 0)}종
                    </p>
                  </div>
                  <span aria-hidden className="text-[var(--copper)]">
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── 지역별 안내 ── */}
      <section id="regions" className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="eyebrow">Regions</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-3xl">지역별 안내</h2>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[...dongStats.values()].map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
              >
                {d.dong}
                <span className="ml-1.5 text-[11px] font-semibold text-[var(--ink-soft)]">
                  {d.count}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
            숫자는 해당 동네에서 안내 중인 수리 항목 수입니다.
          </p>
        </div>
      </section>

      {/* ── 시공 기록 ── */}
      <section id="cases" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="eyebrow">Field Records</p>
        <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-3xl">실제 시공 기록</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          문제 → 판단 → 작업 → 검측 결과, 현장 순서 그대로 기록했습니다.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {featured.map(({ page, chain, kw, cat }) => {
            const casePage = caseByKey.get(`${page.repair_keyword_id}:${page.region_id}`)
            if (!casePage?.slug) return null
            const dong = chain[chain.length - 1]
            const photo = categoryPhoto(cat?.slug ?? '', `${kw!.slug}/${dong.slug}`, 1)
            return (
              <Link
                key={casePage.id}
                href={`/case/${casePage.slug}`}
                className="card group overflow-hidden transition-shadow hover:shadow-xl"
              >
                <div className="relative aspect-[16/8] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt=""
                    style={photo.style}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-[var(--ink)]/85 px-2.5 py-1 text-[11px] font-bold text-[var(--paper)]">
                    {cat?.display_name} · {dong.display_name}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-extrabold leading-snug">{casePage.meta_title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--ink-soft)] line-clamp-2">
                    {page.guide?.summary}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
