import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { categoryPhoto } from '@/lib/photos'
import { getPartners } from '@/lib/partners'
import { PageHero, SectionHead } from '@/app/_components/PageHero'
import { PartnerSites } from '@/app/_components/PartnerSites'
import '@/app/_styles/category.css'

export const dynamicParams = false

// 지역이 177곳까지 늘어난다 — 키워드마다 전부 펼치면 이 페이지가 칩 수천 개가 된다.
// 앞쪽만 보여주고 나머지는 키워드 허브로 넘긴다.
const REGION_CHIP_LIMIT = 24

const pad2 = (n: number) => String(n).padStart(2, '0')

export async function generateStaticParams() {
  const { categories } = await getAllData()
  return categories.map((c) => ({ category: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params
  const { categories } = await getAllData()
  const category = categories.find((c) => c.slug === categorySlug)
  if (!category) return {}
  return { title: `${category.display_name} 수리 가이드 | 수리위키` }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category: categorySlug } = await params
  const { categories, keywords, pages, regions } = await getAllData()
  const category = categories.find((c) => c.slug === categorySlug)
  if (!category) notFound()

  const { byId } = buildRegionIndex(regions)
  const categoryKeywords = keywords
    .filter((k) => k.category_id === category.id)
    .sort((a, b) => a.menu_order - b.menu_order)

  const landingsByKeyword = new Map<number, { path: string; dong: string }[]>()
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.region_id || !p.repair_keyword_id) continue
    const chain = getAncestorChain(p.region_id, byId)
    if (chain.length === 0) continue
    const list = landingsByKeyword.get(p.repair_keyword_id) ?? []
    list.push({
      path: chain.map((r) => r.slug).join('/'),
      dong: chain[chain.length - 1].display_name,
    })
    landingsByKeyword.set(p.repair_keyword_id, list)
  }

  // 분야 번호는 정렬 순서 그대로 — 히어로 라벨과 '다른 분야' 타일이 같은 번호를 쓴다.
  const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const categoryNo = sortedCategories.findIndex((c) => c.id === category.id) + 1
  const otherCategories = sortedCategories.filter((c) => c.id !== category.id)

  const itemCountByCategory = new Map<number, number>()
  for (const k of keywords) itemCountByCategory.set(k.category_id, (itemCountByCategory.get(k.category_id) ?? 0) + 1)

  const rows = categoryKeywords.map((keyword) => {
    const live = landingsByKeyword.get(keyword.id) ?? []
    const shown = live.slice(0, REGION_CHIP_LIMIT)
    return { keyword, live, shown, hidden: live.length - shown.length }
  })

  // 히어로 수치 — 전부 위에서 계산한 값. 0이면 칸째 뺀다.
  const landingCount = rows.reduce((n, r) => n + r.live.length, 0)
  const regionCount = new Set(rows.flatMap((r) => r.live.map((l) => l.path))).size
  const stats = [
    { label: '수리 항목', value: categoryKeywords.length },
    { label: '지역 안내 페이지', value: landingCount },
    { label: '안내 지역', value: regionCount },
  ].filter((s) => s.value > 0)

  // PartnerSites는 목록이 비면 섹션째 그리지 않는다 — 섹션 번호가 01, 03으로 건너뛰지 않게 미리 본다.
  const hasPartners = getPartners().partners.some((p) => p.hub.slug === category.slug)
  const moreNum = pad2(hasPartners ? 3 : 2)

  // 분야 대표 실사. 없으면 사진 칸을 비운다(PageHero가 한 칸 배치로 바뀐다).
  const photoSrc = categoryPhoto(category.slug)

  return (
    <main>
      <PageHero
        tone="paper"
        above={
          <nav aria-label="현재 위치">
            <ol className="flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-[var(--ink-soft)]">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center hover:text-[var(--copper)]">
                  수리위키
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li>
                <Link href="/#services" className="inline-flex min-h-11 items-center hover:text-[var(--copper)]">
                  수리 분야
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li aria-current="page" className="font-bold text-[var(--ink)]">
                {category.display_name}
              </li>
            </ol>
          </nav>
        }
        eyebrow={`수리 분야 ${pad2(categoryNo)} / ${pad2(sortedCategories.length)}`}
        title={category.display_name}
        desc={`${category.display_name} 분야에서 안내 중인 수리 항목입니다. 항목을 고르면 지역별 안내로 이어집니다.`}
        photo={photoSrc ? { src: photoSrc, alt: `${category.display_name} 시공 현장` } : undefined}
      >
        {stats.length > 0 && (
          <dl className="cg-stats" style={{ ['--n' as string]: stats.length }}>
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value.toLocaleString('ko-KR')}</dd>
              </div>
            ))}
          </dl>
        )}
      </PageHero>

      {/* ── 01 수리 항목 — 번호 · 항목 · 지역 칩 대장. 헤더 '서비스'(#services)가 여기로 온다 ── */}
      <section id="services" className="section-y sec-rule scroll-mt-16">
        <div className="wrap">
          <SectionHead
            num="01"
            label="수리 항목"
            title={`${category.display_name} 수리 항목 ${categoryKeywords.length}개`}
            desc={`항목 이름을 누르면 그 항목의 안내로, 지역 이름을 누르면 그 지역의 안내 페이지로 이동합니다. 지역은 항목마다 ${REGION_CHIP_LIMIT}곳까지 보이고, 나머지는 항목 안내에서 모두 볼 수 있습니다.`}
          />
          <ol className="panel cg-ledger mt-10" data-reveal="stagger" style={{ ['--stagger' as string]: '60ms' }}>
            {rows.map(({ keyword, live, shown, hidden }, i) => (
              <li key={keyword.id} className="cg-row" style={{ ['--i' as string]: i }}>
                <span className="cg-num" aria-hidden>
                  {pad2(i + 1)}
                </span>
                <div className="cg-main">
                  {/* 지역이 0곳이어도 허브 페이지는 항상 생긴다 — 죽은 회색 텍스트로 두지 않는다 */}
                  <h3 className="cg-title">
                    <Link href={`/${keyword.slug}`}>{keyword.display_name}</Link>
                  </h3>
                  {keyword.description && <p className="cg-desc">{keyword.description}</p>}
                </div>
                <div className="cg-regions">
                  {live.length === 0 ? (
                    <p className="cg-none">
                      <span className="cg-badge">수도권 전역</span>
                    </p>
                  ) : (
                    <>
                      <p className="cg-regions-label">
                        <span className="tick" aria-hidden />
                        지역 안내 {live.length}곳{hidden > 0 ? ` 중 ${shown.length}곳` : ''}
                      </p>
                      <ul className="cg-chips">
                        {shown.map((l) => (
                          <li key={l.path}>
                            <Link href={`/${keyword.slug}/${l.path}`} className="cg-chip">
                              {l.dong}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {hidden > 0 && (
                        <Link href={`/${keyword.slug}`} className="cg-more">
                          지역 전체 보기 →
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <PartnerSites
        num="02"
        category={category.slug}
        title={`${category.display_name} 지역 전문 사이트`}
        desc={`${category.display_name} 분야를 따로 운영하는 수리위키 지역 전문 사이트입니다.`}
      />

      {/* ── 거미줄 링크: 다른 분야 · 홈 ── */}
      <section className="section-y sec-rule">
        <div className="wrap">
          <SectionHead
            num={moreNum}
            label="다른 분야"
            title="다른 분야 둘러보기"
            desc={`수리 항목 ${keywords.length}종을 분야 ${sortedCategories.length}개로 묶었습니다.`}
          />
          <ul className="cg-others mt-10" data-reveal="stagger" style={{ ['--stagger' as string]: '50ms' }}>
            {otherCategories.map((c, i) => {
              const count = itemCountByCategory.get(c.id) ?? 0
              return (
                <li key={c.id} style={{ ['--i' as string]: i }}>
                  <Link href={`/category/${c.slug}`} className="cg-other">
                    <span className="cg-other-num" aria-hidden>
                      {pad2(sortedCategories.indexOf(c) + 1)}
                    </span>
                    <span className="cg-other-name">{c.display_name}</span>
                    {count > 0 && <span className="cg-other-count">항목 {count}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap" data-reveal="up">
            <Link href="/#services" className="btn-ghost">
              수리 항목 전체 보기
            </Link>
            <Link href="/" className="btn-ghost">
              홈으로
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
