import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { categoryPhoto } from '@/lib/photos'
import { getKeywordImages, groupSetsByKeyword, coverImage } from '@/lib/keyword-images'
import { PageHero, SectionHead } from '@/app/_components/PageHero'

// 참고 스킨의 "서비스 과정" 다섯 칸. 사이트 전체에서 이미 약속하는 흐름(사진 접수 → 진단 → 마감)만 적는다.
const PROCESS_STEPS = [
  { title: '사진 접수', desc: '새는 곳·깨진 곳 사진과 지역, 증상을 남기면 먼저 확인합니다.' },
  { title: '원인 진단', desc: '보이는 자리와 원인 자리가 다를 수 있어 원인부터 짚습니다.' },
  { title: '범위 확인', desc: '고칠 범위와 자재, 추가될 수 있는 조건을 작업 전에 정합니다.' },
  { title: '시공', desc: '정한 범위 안에서 작업하고 바뀌는 점은 그 자리에서 알립니다.' },
  { title: '마감 점검', desc: '작업 뒤 상태를 함께 확인하고 기록을 남깁니다.' },
]

// 지역이 177곳까지 늘어난다. 전부 칩으로 깔면 홈이 링크 덤프가 되고 본문이 밀린다 —
// 안내 항목이 많은 순으로 이만큼만 노출하고, 잘라낸 개수는 화면에 밝힌다.
const REGION_CHIP_LIMIT = 60

// 카드 부제에 적는 대표 지역 개수
const CARD_REGION_SAMPLE = 3

// 피드 자동탐지 링크. 피드 리더와 검색엔진은 홈 <head>에서 이걸 찾는다.
// 전 페이지 공통이면 layout에 두는 게 맞지만, 여기 둬도 홈에서 발견되면 충분하다.
export const metadata: Metadata = {
  alternates: {
    types: { 'application/rss+xml': [{ url: 'https://suriwiki.com/rss.xml', title: '수리위키 새 글' }] },
  },
}

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

  // 시공 기록 (CASE) 카드 데이터 구성
  const caseCards = cases
    .map((casePage) => {
      const kw = casePage.repair_keyword_id ? keywordById.get(casePage.repair_keyword_id) : undefined
      const cat = kw ? categoryById.get(kw.category_id) : undefined
      const chain = casePage.region_id ? getAncestorChain(casePage.region_id, byId) : []
      const dong = chain[chain.length - 1]
      const landing = landings.find(
        (l) =>
          l.page.repair_keyword_id === casePage.repair_keyword_id &&
          l.page.region_id === casePage.region_id,
      )
      const summary = landing?.page.guide?.summary ?? casePage.meta_description
      const cover = kw ? coverImage(setsByKeyword.get(kw.id)) : null
      const fallback = categoryPhoto(
        cat?.slug ?? '',
        `${kw?.slug ?? ''}/${dong?.slug ?? ''}`,
        1,
        kw?.display_name,
      )
      return {
        casePage,
        kw,
        cat,
        dong,
        summary,
        photo: cover ? { src: cover, style: undefined } : fallback,
      }
    })
    .filter((x) => x.kw && x.dong)

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
      {/* ── 히어로: 머스터드 색 블록 + 큰 사진 ── */}
      <PageHero
        tone="yellow"
        eyebrow="Home Repair Lab / Local"
        title={
          <>
            새는 곳보다
            <br />
            새는 이유를
            <br />
            먼저 봅니다.
          </>
        }
        desc={
          <>
            싱크대 누수, 화장실 악취, 뻑뻑한 샷시, 내려가는 차단기, 곰팡이 도배까지 — 동네 담당
            마스터가 진단부터 마감까지 한 번에 처리합니다. 사진 한 장이면 진단을 시작할 수 있어요.
          </>
        }
        tags={['Photo First', 'Fix The Cause']}
        photo={{ src: heroPhoto.src, alt: '배관 점검 작업', style: heroPhoto.style }}
      >
        <a href="#services" className="btn-call">
          수리 분야 보기
        </a>
        <a href="#process" className="btn-ghost">
          진행 과정 보기
        </a>
      </PageHero>

      {/* ── 수리 분야 (키워드 사진 카드) ── */}
      <section id="services" className="section-y scroll-mt-16 mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead
          eyebrow="Service Doors / Repair"
          title={
            <>
              고칠 곳의 이름으로
              <br />
              바로 찾습니다.
            </>
          }
          desc={`수리 항목 ${keywordCards.length}종. 항목을 고르면 그 항목의 지역별 안내 페이지로 이동합니다. 작업 중에는 전화 연결이 어려워 사진과 지역·수리 내용을 남겨 주시면 확인 후 안내드립니다.`}
        />

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
                    <span className="absolute left-3 top-3 bg-[var(--ink)] px-2.5 py-1 text-[11px] font-bold text-white">
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

      {/* ── 진행 과정 — 참고 스킨의 번호 다섯 칸 ── */}
      <section id="process" className="section-y scroll-mt-16 border-t border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead
            eyebrow="Five Checkpoints"
            title={
              <>
                진행 단계마다
                <br />
                확인할 것이 있습니다.
              </>
            }
            desc="작업 시간과 범위는 현장 상태와 원인, 자재에 따라 달라질 수 있습니다. 바뀌는 조건은 작업 전에 먼저 알립니다."
          />
          <ol className="num-cols mt-10" style={{ ['--cols' as string]: 5 }}>
            {PROCESS_STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 실제 시공 기록 ── */}
      {caseCards.length > 0 && (
        <section id="cases" className="section-y scroll-mt-16 border-t border-[var(--line)] bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHead
              eyebrow="Field Records"
              title={
                <>
                  작업보다 먼저
                  <br />
                  확인 장면을 남깁니다.
                </>
              }
              desc="문제 확인부터 현장 판단, 작업 내용, 검측 결과까지 현장에서 실제로 진행된 순서 그대로 기록했습니다."
            />

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {caseCards.map(({ casePage, kw, dong, summary, photo }) => (
                <Link
                  key={casePage.id}
                  href={`/case/${casePage.slug}`}
                  className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-xl"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-[var(--line)]/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt=""
                      style={photo.style}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    <span className="absolute left-3 top-3 bg-[var(--ink)] px-2.5 py-1 text-[11px] font-bold text-white">
                      {kw!.display_name} · {dong!.display_name}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h3 className="font-extrabold leading-snug transition-colors group-hover:text-[var(--copper)]">
                        {casePage.meta_title}
                      </h3>
                      {summary && (
                        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                          {summary}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[var(--line)]/60 pt-3 text-xs font-bold text-[var(--copper)]">
                      <span>현장 기록 원장 보기</span>
                      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 지역별 안내 ── */}
      <section id="regions" className="section-y scroll-mt-16 border-t border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead
            eyebrow="Region Index"
            title={
              <>
                동네를 고르면
                <br />
                그 동네 수리로 갑니다.
              </>
            }
            desc="동네를 고르면 그 동네에서 안내 중인 수리로 바로 이동합니다."
          />
          <div className="mt-8 flex flex-wrap gap-2.5">
            {shownRegions.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                title={d.upper ? `${d.upper} ${d.dong}` : d.dong}
                className="border border-[var(--ink)]/25 bg-white px-4 py-3 text-sm font-bold sm:py-2 hover:border-[var(--copper)] hover:text-[var(--copper)]"
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
