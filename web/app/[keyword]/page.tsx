import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { keywordPhoto, keywordPhotos } from '@/lib/photos'
import { josa } from '@/lib/josa'
import { PageHero, SectionHead } from '@/app/_components/PageHero'
import { getKeywordImages, groupSetsByKeyword, isIllustrationOnly } from '@/lib/keyword-images'
import { BeforeAfterSlider } from '@/app/_components/BeforeAfterSlider'
import { fallbackPhone, telHrefOf } from '@/lib/contact'
import type { Page, Region } from '@/lib/types'

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const dynamicParams = false

// 거미줄 링크 한 줄 스타일 — globals.css는 다른 담당 파일이라 클래스 추가 대신 여기서 묶는다.
const ROW =
  'group flex items-baseline justify-between gap-2 rounded-lg border border-transparent px-3 py-2.5 hover:border-[var(--line)] hover:bg-[var(--paper)]'

// 지역이 아직 0개인 키워드도 허브를 만든다.
// 발행된 지역 페이지가 있는 키워드만 만들던 때에는 sitemap에는 있는데 실제로는 404인
// 주소가 생겼다(52개 중 18개). 지역이 없으면 본문에서 안내 문구를 대신 보여준다.
export async function generateStaticParams() {
  const { keywords } = await getAllData()
  return keywords.map((k) => ({ keyword: k.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ keyword: string }> }) {
  const { keyword: keywordSlug } = await params
  const { keywords } = await getAllData()
  const keyword = keywords.find((k) => k.slug === keywordSlug)
  if (!keyword) return {}
  const also = keyword.aliases?.length ? ` ${keyword.aliases.join('·')} 안내 포함.` : ''
  return {
    title: `${keyword.display_name} 지역별 가이드 | 수리위키`,
    description: keyword.description ? `${keyword.description}${also}` : undefined,
  }
}

export default async function KeywordHubPage({
  params,
}: {
  params: Promise<{ keyword: string }>
}) {
  const { keyword: keywordSlug } = await params
  const { keywords, categories, pages, regions, localPros } = await getAllData()
  const keyword = keywords.find((k) => k.slug === keywordSlug)
  if (!keyword) notFound()

  const category = categories.find((c) => c.id === keyword.category_id)
  // 하위 지역 페이지가 상속하는 것과 같은 키워드 자산. 허브에서도 그대로 쓴다.
  const kc = keyword.content
  const { byId } = buildRegionIndex(regions)

  // 곧 키워드 76개 × 지역 페이지 1,300건이다. 허브 한 장을 그릴 때마다 pages 전체를
  // 여러 번 훑으면 빌드 시간이 곱으로 늘어나므로, 요청 스코프에서 인덱스를 한 번만
  // 만들어 아래 모든 블록이 재사용한다(getAllData 자체는 React.cache로 1회 호출).
  const keywordById = new Map(keywords.map((k) => [k.id, k]))
  const landingsByKeyword = new Map<number, Page[]>()
  const landingsByRegion = new Map<number, Page[]>()
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.region_id || !p.repair_keyword_id) continue
    const kwList = landingsByKeyword.get(p.repair_keyword_id)
    if (kwList) kwList.push(p)
    else landingsByKeyword.set(p.repair_keyword_id, [p])
    const rgList = landingsByRegion.get(p.region_id)
    if (rgList) rgList.push(p)
    else landingsByRegion.set(p.region_id, [p])
  }

  // 같은 지역 조상 체인을 여러 블록이 반복해서 계산한다 — 지역당 한 번만 만든다.
  const chainCache = new Map<number, Region[]>()
  const chainOf = (regionId: number) => {
    const hit = chainCache.get(regionId)
    if (hit) return hit
    const chain = getAncestorChain(regionId, byId)
    chainCache.set(regionId, chain)
    return chain
  }

  // 링크 주소는 generateStaticParams가 만드는 집합과 반드시 같아야 한다 —
  // 발행된 LANDING + 조상 체인이 비지 않은 조합만 남긴다.
  const myLandings = (landingsByKeyword.get(keyword.id) ?? [])
    .map((page) => ({ page, chain: chainOf(page.region_id!) }))
    .filter((x) => x.chain.length > 0)
    .sort((a, b) => {
      const an = a.chain.map((r) => r.display_name).join(' ')
      const bn = b.chain.map((r) => r.display_name).join(' ')
      return an.localeCompare(bn, 'ko')
    })

  // 사진은 키워드 단위로 등록하고 하위 지역 페이지가 전부 물려받는다.
  const sets = groupSetsByKeyword(await getKeywordImages()).get(keyword.id) ?? []
  const setsAreIllustration = sets.length > 0 && isIllustrationOnly(sets)
  // 히어로 사진은 이 키워드와 맞는 실사만. 없으면 사진 칸 대신 세부 항목 목록을 둔다.
  const heroPhoto = keywordPhotos(keyword.slug, 1)[0] ?? null // 첫 장 = 이 키워드 실사 세트의 대표 완성 사진

  // 지역 페이지가 없는 항목(단일 키워드 그룹)은 같은 분야의 지역 안내로 이어 준다.
  const siblingHubs = keywords.filter(
    (k) => k.id !== keyword.id && k.category_id === keyword.category_id,
  )

  // 이 키워드가 가장 촘촘히 깔린 지역을 하나 골라, 그 지역의 다른 키워드로 건너뛰게 한다.
  // 이 블록이 없으면 키워드끼리는 홈을 거치지 않고는 연결되지 않는다.
  let repRegion: Region | undefined
  let repChain: Region[] = []
  let repBest = -1
  for (const { page, chain } of myLandings) {
    const n = (landingsByRegion.get(page.region_id!) ?? []).length
    if (n > repBest) {
      repBest = n
      repRegion = byId.get(page.region_id!)
      repChain = chain
    }
  }
  const repOthers = repRegion
    ? (landingsByRegion.get(repRegion.id) ?? [])
        .filter((p) => p.repair_keyword_id !== keyword.id)
        .map((p) => ({ page: p, kw: keywordById.get(p.repair_keyword_id!) }))
        .filter((x) => x.kw)
        .sort((a, b) => a.kw!.menu_order - b.kw!.menu_order)
        .slice(0, 12)
    : []
  const repPath = repChain.map((r) => r.slug).join('/')

  // 다른 키워드 허브 — 지역 페이지가 많은 순. 이제 모든 키워드에 허브가 생기므로
  // 지역이 0개인 키워드로 링크해도 404가 아니다.
  const otherHubs = keywords
    .filter((k) => k.id !== keyword.id)
    .sort(
      (a, b) =>
        (landingsByKeyword.get(b.id)?.length ?? 0) - (landingsByKeyword.get(a.id)?.length ?? 0) ||
        a.menu_order - b.menu_order,
    )
    .slice(0, 18)

  // 키워드에 전용 번호가 지정돼 있으면 그것, 없으면 등록된 지역 마스터의 대표 번호.
  const phone = keyword.default_phone ?? fallbackPhone(localPros)
  const telHref = telHrefOf(phone)

  return (
    <main>
      {/* ── 히어로 — 파란 색 블록. 키워드 허브는 파랑, 지역 페이지는 차콜로 층을 구분한다 ── */}
      <PageHero
        tone="blue"
        above={
          <nav aria-label="현재 위치" className="mb-5 text-[13px] text-white/75">
            <Link href="/" className="hover:text-white">
              수리위키
            </Link>
            {' › '}
            <span className="font-bold text-white">{keyword.display_name}</span>
          </nav>
        }
        eyebrow={`Service / ${category?.display_name ?? 'Repair'}`}
        title={keyword.display_name}
        desc={
          <>
            {keyword.description && <p>{keyword.description}</p>}
            {/* 후킹 문구에 키워드를 그대로 넣어 검색어와 화면의 말이 어긋나지 않게 한다. */}
            <p className="mt-3 font-bold opacity-100">
              {keyword.display_name}, 사진 한 장이면 오늘 처리 가능한지 바로 알려드립니다.
            </p>
            <p className="mt-3 text-[13px]">
              작업 중에는 전화 연결이 어려우니, 사진과 지역·수리 내용을 문자로 남겨 주시면 확인 후
              안내드립니다.
            </p>
            {keyword.aliases && keyword.aliases.length > 0 && (
              <p className="mt-3 text-[13px]">함께 찾는 말: {keyword.aliases.join(' · ')}</p>
            )}
          </>
        }
        tags={['Photo Diagnosis', myLandings.length > 0 ? `${myLandings.length} Local Pages` : 'Local Master']}
        /* 실제 현장 사진만 건다. 맞는 실사가 없으면 사진 칸 대신 세부 항목 목록이 선다. */
        photo={heroPhoto ? { src: heroPhoto, alt: `${keyword.display_name} 시공 현장` } : undefined}
        aside={
          kc && kc.services.length > 0 ? (
            <div className="bg-white p-5 text-[var(--ink)]">
              <p className="eyebrow">What We Fix</p>
              <ul className="rule-list mt-3">
                {kc.services.map((s, i) => (
                  <li key={i} className="py-2.5 text-sm font-bold">
                    {s.title}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">{kc.tagline}</p>
            </div>
          ) : undefined
        }
      >
        {telHref && (
          <a href={telHref} className="btn-call">
            <PhoneIcon />
            {phone} {keyword.display_name} 상담
          </a>
        )}
        <a href="#regions" className="btn-ghost">
          {myLandings.length > 0 ? '서비스 지역' : '다른 수리 항목 보기'}
        </a>
      </PageHero>

      {/* ── 시공 전 · 후 (운영자가 올린 실제 사진만) ── */}
      {sets.length > 0 && (
        <section className="border-b border-[var(--line)] bg-white">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <p className="eyebrow">Before / After</p>
            <h2 className="font-serif-kr mt-2 text-2xl font-black">시공 전 · 후</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {setsAreIllustration
                ? `${keyword.display_name} 작업 내용을 나타낸 개념도입니다.`
                : `실제 현장 사진입니다.`}{' '}
              손잡이를 좌우로 움직이면 같은 자리의 시공 전과 후가 겹쳐 보입니다.
            </p>
            <div className="mt-6">
              <BeforeAfterSlider sets={sets} alt={`${keyword.display_name} 시공 전후 사진`} />
            </div>
            <p className="mt-3 text-[13px] text-[var(--ink-soft)]">
              이 자료는 {keyword.display_name} 하위 지역 페이지에도 함께 적용됩니다.
            </p>
          </div>
        </section>
      )}

      {/* ── 키워드 자산 ──
          지역 페이지가 상속하는 것과 같은 내용이다. 허브에도 두는 이유: 지역을 아직 안 고른
          방문자가 "이 수리가 뭘 하는 건지"를 여기서 끝내고 지역을 고를 수 있어야 한다.
          이게 없으면 허브는 지역 목록만 있는 링크 페이지가 된다. */}
      {kc && kc.services.length > 0 && (
        <section className="section-y mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead
            eyebrow="Repair Check / Items"
            title={`${keyword.display_name} 세부 항목`}
            desc={kc.tagline}
          />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kc.services.map((s, i) => (
              <li key={i} className="top-rule-card">
                <p className="eyebrow">{String(i + 1).padStart(2, '0')} / Item</p>
                <h3 className="mt-6 text-lg font-black tracking-[-0.03em]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{s.desc}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {kc && kc.symptoms.length > 0 && (
        <section className="border-y border-[var(--line)] bg-white">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <p className="eyebrow">Self Check</p>
                <h2 className="font-serif-kr mt-2 text-2xl font-black">
                  이런 증상이면 의심하세요
                </h2>
                <ul className="mt-6 space-y-3.5">
                  {kc.symptoms.map((s, i) => (
                    <li key={i} className="diag-item text-[15px] leading-snug">
                      <span aria-hidden className="diag-box" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {kc.why_pro.length > 0 && (
                <div>
                  <p className="eyebrow">Why Pro</p>
                  <h2 className="font-serif-kr mt-2 text-2xl font-black">
                    전문 업체 시공이 유리한 이유
                  </h2>
                  <ul className="mt-6 space-y-3">
                    {kc.why_pro.map((r, i) => (
                      <li key={i} className="flex gap-3 text-[15px] leading-snug">
                        <span aria-hidden className="mt-0.5 font-black text-[var(--copper)]">
                          ✓
                        </span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {kc && kc.process.length > 0 && (
        <section id="process" className="section-y scroll-mt-20 mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead
            eyebrow="Service Process"
            title={
              <>
                {keyword.display_name},
                <br />
                이렇게 진행합니다.
              </>
            }
            desc="작업 시간과 범위는 현장 상태와 원인, 자재에 따라 달라질 수 있습니다."
          />
          <ol className="num-cols mt-10" style={{ ['--cols' as string]: Math.min(kc.process.length, 5) }}>
            {kc.process.map((step, i) => (
              <li key={i}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── 지역별 가이드 ── */}
      <section id="regions" className="section-y mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Region Index" title="서비스 지역" />
        {myLandings.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              동네를 고르면 그 지역의 {keyword.display_name} 안내로 이동합니다.
            </p>
            {/* 지역명만 나열하면 어느 항목의 지역인지가 카드에서 사라진다.
                제목을 "강남구 문수리"로 두어 카드 하나만 봐도 목적지가 드러나게 한다. */}
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {myLandings.map(({ page, chain }) => {
                const path = chain.map((r) => r.slug).join('/')
                const dong = chain[chain.length - 1]
                const upper = chain
                  .slice(0, -1)
                  .map((r) => r.display_name)
                  .join(' ')
                // 이 키워드와 맞는 실사가 있을 때만 썸네일을 단다. 지역 slug로 카드마다 다른 장.
                const src = keywordPhoto(keyword.slug, dong.slug)
                return (
                  <li key={page.id}>
                    <Link
                      href={`/${keyword.slug}/${path}`}
                      className="card group block overflow-hidden transition-shadow hover:shadow-xl"
                    >
                      {src && (
                        <div className="relative aspect-[16/9] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          {upper && (
                            <p className="truncate text-[11px] text-[var(--ink-soft)]">{upper}</p>
                          )}
                          <p className="mt-0.5 truncate text-base font-extrabold">
                            {dong.display_name} {keyword.display_name}
                          </p>
                          {dong.profile?.near && (
                            <p className="mt-1 truncate text-[12px] text-[var(--ink-soft)]">
                              {dong.profile.near}
                            </p>
                          )}
                        </div>
                        <span
                          aria-hidden
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--line)] text-[var(--copper)] group-hover:border-[var(--copper)]"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <p className="mt-6 text-sm text-[var(--ink-soft)]">
              목록에 없는 동네도 인근이면 같은 일정으로 출장합니다.
            </p>
          </>
        ) : (
          <div className="card mt-6 p-6 sm:p-8">
            <p className="text-lg font-extrabold">{josa(keyword.display_name, '은', '는')} 수도권 전역 출장합니다</p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              지역을 따로 나누지 않고 서울·경기·인천 어디든 방문합니다. 사진과 주소를 남겨 주시면
              일정을 확인해 회신드립니다. 동네별 안내는 같은 분야 항목에서 볼 수 있습니다.
            </p>
            {siblingHubs.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2.5">
                {siblingHubs.map((k) => (
                  <li key={k.id}>
                    <Link
                      href={`/${k.slug}#regions`}
                      className="inline-block border border-[var(--ink)]/25 bg-white px-4 py-3 text-sm font-bold sm:py-2 hover:border-[var(--copper)] hover:text-[var(--copper)]"
                    >
                      {k.display_name}
                      {(landingsByKeyword.get(k.id)?.length ?? 0) > 0 && (
                        <span className="ml-1.5 font-normal text-[var(--ink-soft)]">
                          {landingsByKeyword.get(k.id)!.length}개 지역
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {telHref && (
                <a href={telHref} className="btn-call">
                  {phone} 상담
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── FAQ (키워드 공통) ── */}
      {kc && kc.faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
          <p className="eyebrow">FAQ</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">자주 묻는 질문</h2>
          <div className="mt-6">
            {kc.faqs.map((f, i) => (
              <details key={i} className="faq">
                <summary>{f.q}</summary>
                <div className="text-sm">{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ── 거미줄 내부링크 ── */}
      <section id="more" className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="eyebrow">Related</p>
          <h2 className="font-serif-kr mt-2 text-xl font-black">이어서 볼 페이지</h2>

          {repRegion && repOthers.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-extrabold">
                {repRegion.display_name}에서 함께 가능한 수리
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {repOthers.map(({ page, kw }) => (
                  <li key={page.id}>
                    <Link href={`/${kw!.slug}/${repPath}`} className={ROW}>
                      <span className="text-sm">
                        <b>{kw!.display_name}</b>{' '}
                        <span className="text-[var(--ink-soft)]">{repRegion!.display_name}</span>
                      </span>
                      <span aria-hidden className="text-[var(--copper)]">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-sm font-extrabold">다른 수리 항목</h3>
            <ul className="mt-3 flex flex-wrap gap-2.5">
              {otherHubs.map((k) => (
                <li key={k.id}>
                  <Link
                    href={`/${k.slug}`}
                    className="inline-block rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm font-bold sm:py-2 hover:border-[var(--copper)] hover:text-[var(--copper)]"
                  >
                    {k.display_name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
              <Link href="/" className="tap44 font-bold text-[var(--teal)] hover:underline">
                전체 수리 항목 보기
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
