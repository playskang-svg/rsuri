import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { categoryPhoto, homeHeroPhoto } from '@/lib/photos'
import { PageHero, SectionHead } from '@/app/_components/PageHero'

// 참고 스킨의 "서비스 과정" 다섯 칸. 사이트 전체에서 이미 약속하는 흐름(사진 접수 → 진단 → 마감)만 적는다.
const PROCESS_STEPS = [
  { title: '사진 접수', desc: '깨진 곳·상한 곳 사진과 지역, 증상을 남기면 먼저 확인합니다.' },
  { title: '원인 진단', desc: '보수로 될지 교체가 필요한지, 속까지 상했는지부터 짚습니다.' },
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

  const keywordById = new Map(keywords.map((k) => [k.id, k]))

  const landings = pages
    .filter((p) => p.page_type === 'LANDING' && isPublished(p) && p.region_id && p.repair_keyword_id)
    .map((p) => {
      const chain = getAncestorChain(p.region_id!, byId)
      const kw = keywordById.get(p.repair_keyword_id!)
      return { page: p, chain, kw }
    })
    .filter((x) => x.kw && x.chain.length > 0)

  const heroPhoto = homeHeroPhoto()

  const regionCountByKeyword = new Map<number, number>()
  for (const { kw } of landings) {
    regionCountByKeyword.set(kw!.id, (regionCountByKeyword.get(kw!.id) ?? 0) + 1)
  }

  // 수리 항목 50종을 카드 50장으로 깔면 홈이 길어지기만 하고 고르기 어렵다.
  // 분야(문·문틀·문지방·필름·계단·마루·도배) 일곱 묶음으로 세우고, 묶음 안에서 항목을 고른다.
  const categoryPanels = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => {
      const items = keywords
        .filter((k) => k.category_id === category.id)
        .sort((a, b) => a.menu_order - b.menu_order)
      // 분야 대표 사진(직접 고른 실사). 없으면 사진 없이 글만.
      const photo = categoryPhoto(category.slug)
      return { category, items, photo }
    })
    .filter((x) => x.items.length > 0)

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
            바꾸기 전에
            <br />
            고칠 수 있는지
            <br />
            먼저 봅니다.
          </>
        }
        desc={
          <>
            물먹은 문틀, 깨진 문지방, 구멍 난 방문, 찍힌 마루, 닳은 계단, 찢어진 벽지까지 —
            통째로 바꾸기 전에 부분 보수·복원으로 끝낼 수 있는지부터 봅니다. 사진 한 장이면
            진단을 시작할 수 있어요.
          </>
        }
        tags={['Photo First', 'Repair Before Replace']}
        photo={
          heroPhoto
            ? { src: heroPhoto, alt: '하단을 새로 이어 화이트로 마감한 욕실 문틀 — 실제 시공 현장', style: { objectPosition: '50% 60%' } }
            : undefined
        }
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
          desc={`수리 항목 ${keywords.length}종을 분야 ${categoryPanels.length}개로 묶었습니다. 항목을 고르면 그 항목의 지역별 안내 페이지로 이동합니다. 작업 중에는 전화 연결이 어려워 사진과 지역·수리 내용을 남겨 주시면 확인 후 안내드립니다.`}
        />

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categoryPanels.map(({ category, items, photo }) => (
            <div key={category.id} className="card flex flex-col overflow-hidden">
              {photo && (
                <Link href={`/category/${category.slug}`} className="relative block aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={`${category.display_name} 시공 현장`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.04]"
                  />
                </Link>
              )}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-extrabold">
                  <Link href={`/category/${category.slug}`} className="tap44 hover:text-[var(--copper)]">
                    {category.display_name}
                  </Link>
                </h3>
                <ul className="mt-2 divide-y divide-[var(--line)]">
                  {items.map((k) => {
                    const n = regionCountByKeyword.get(k.id) ?? 0
                    return (
                      <li key={k.id}>
                        <Link
                          href={`/${k.slug}`}
                          className="flex min-h-11 items-center justify-between gap-3 py-1.5 text-[15px] font-bold hover:text-[var(--copper)]"
                        >
                          <span>{k.display_name}</span>
                          <span className="flex-none text-[12px] font-normal text-[var(--ink-soft)]">
                            {n > 0 ? `${n}개 지역` : '수도권 전역'} →
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          ))}
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
