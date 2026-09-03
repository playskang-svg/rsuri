import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { categoryPhoto } from '@/lib/photos'
import { getKeywordImages, groupSetsByKeyword, coverImage } from '@/lib/keyword-images'

// 지역이 177곳까지 늘어난다. 전부 칩으로 깔면 홈이 링크 덤프가 되고 본문이 밀린다 —
// 안내 항목이 많은 순으로 이만큼만 노출하고, 잘라낸 개수는 화면에 밝힌다.
const REGION_CHIP_LIMIT = 60

// 카드 부제에 적는 대표 지역 개수
const CARD_REGION_SAMPLE = 3

export default async function HomePage() {
  const { categories, keywords, pages, regions } = await getAllData()
  const { byId } = buildRegionIndex(regions)
  const setsByKeyword = groupSetsByKeyword(await getKeywordImages())

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

  const heroPhoto = categoryPhoto('leak-waterproof', 'home-hero')

  // 키워드별 발행 지역 수 + 대표 지역 이름
  const keywordStats = new Map<number, { count: number; dongs: string[] }>()
  for (const { kw, chain } of landings) {
    const stat = keywordStats.get(kw!.id) ?? { count: 0, dongs: [] as string[] }
    stat.count += 1
    const dong = chain[chain.length - 1].display_name
    if (stat.dongs.length < CARD_REGION_SAMPLE && !stat.dongs.includes(dong)) stat.dongs.push(dong)
    keywordStats.set(kw!.id, stat)
  }

  // 지역 0곳 키워드도 카드로 낸다 — 허브는 항상 생기고, 배지로 "준비 중"을 밝힌다.
  const keywordCards = keywords
    .map((keyword) => ({
      keyword,
      ...(keywordStats.get(keyword.id) ?? { count: 0, dongs: [] as string[] }),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.keyword.display_name.localeCompare(b.keyword.display_name, 'ko'),
    )

  // 지역 색인: 동별로 발행 키워드 수 집계
  const dongStats = new Map<number, { dong: string; upper: string; count: number; href: string }>()
  for (const { chain, kw } of landings) {
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
  const regionChips = [...dongStats.values()].sort(
    (a, b) => b.count - a.count || a.dong.localeCompare(b.dong, 'ko'),
  )
  const shownRegions = regionChips.slice(0, REGION_CHIP_LIMIT)
  const hiddenRegionCount = regionChips.length - shownRegions.length

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
          </div>
        </div>
      </section>

      {/* ── 수리 분야 (키워드 사진 카드) ── */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="eyebrow">Services</p>
        <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-3xl">수리 분야</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          수리 항목 {keywordCards.length}종. 항목을 고르면 그 항목의 지역별 안내 페이지로
          이동합니다.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {keywordCards.map(({ keyword, count, dongs }) => {
            const category = categoryById.get(keyword.category_id)
            // 운영자가 키워드에 넣은 실제 사진이 우선. 없을 때만 참고 이미지로 폴백한다
            // (해시 변형 style도 폴백 사진에만 쓴다 — 실제 사진은 색을 건드리지 않는다).
            const cover = coverImage(setsByKeyword.get(keyword.id))
            const fallback = categoryPhoto(category?.slug ?? '', keyword.slug, 0, keyword.display_name)
            return (
              <Link
                key={keyword.id}
                href={`/${keyword.slug}`}
                className="card group overflow-hidden transition-shadow hover:shadow-xl"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover ?? fallback.src}
                    alt=""
                    style={cover ? undefined : fallback.style}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  {/* 지역 수는 내부 재고일 뿐 방문자에게 의미가 없다 — 아직 준비 중인
                      항목만 그렇다고 밝힌다. */}
                  {count === 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-[var(--ink)]/85 px-2.5 py-1 text-[11px] font-bold text-[var(--paper)]">
                      준비 중
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold">{keyword.display_name}</h3>
                    <p className="mt-0.5 truncate text-[13px] text-[var(--ink-soft)]">
                      {dongs.length > 0 ? dongs.join(' · ') : '지역 페이지 준비 중입니다'}
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
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            동네를 고르면 그 동네에서 안내 중인 수리로 바로 이동합니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {shownRegions.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                title={d.upper ? `${d.upper} ${d.dong}` : d.dong}
                className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
              >
                {d.dong}
              </Link>
            ))}
          </div>
          {hiddenRegionCount > 0 && (
            <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
              찾는 동네가 없다면{' '}
              <a href="#services" className="font-bold text-[var(--teal)] hover:underline">
                수리 항목
              </a>
              에서 항목을 먼저 고르시면 그 항목의 전체 지역을 볼 수 있습니다.
            </p>
          )}
        </div>
      </section>

      {/* 홈의 "실제 시공 기록" 섹션은 걷어냈다. 초기 CASE 6건에만 걸려 있어서 사이트 전체를
          대표하지 못하고, 실사가 아니라 참고 이미지가 시공 결과인 것처럼 보였다.
          시공 전/후는 각 키워드·지역 페이지의 CASES 섹션이 전담한다. */}
    </main>
  )
}
