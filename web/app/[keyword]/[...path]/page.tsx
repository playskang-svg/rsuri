import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { resolveRegionByPath, buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'
import { categoryPhoto } from '@/lib/photos'
import { getKeywordImages, groupSetsByKeyword } from '@/lib/keyword-images'
import { BeforeAfterSlider } from '@/app/_components/BeforeAfterSlider'
import type { Page, PageImageRole, Region } from '@/lib/types'

const ROLE_LABEL: Record<PageImageRole, string> = {
  BEFORE: '시공 전',
  PROCESS: '시공 중',
  AFTER: '시공 후',
  MATERIAL: '사용 자재',
  TOOL: '사용 장비',
  EXCLUDE: '',
}

// 거미줄 링크 한 줄 스타일 — globals.css는 다른 담당 파일이라 클래스 추가 대신 여기서 묶는다.
const ROW =
  'group flex items-baseline justify-between gap-2 rounded-lg border border-transparent px-3 py-2.5 hover:border-[var(--line)] hover:bg-[var(--paper)]'

export const dynamicParams = false

export async function generateStaticParams() {
  const { keywords, pages, regions } = await getAllData()
  const { byId } = buildRegionIndex(regions)
  const keywordSlugById = new Map(keywords.map((k) => [k.id, k.slug]))

  const params: { keyword: string; path: string[] }[] = []
  for (const p of pages) {
    if (p.page_type !== 'LANDING' || !isPublished(p) || !p.region_id || !p.repair_keyword_id) continue
    const keywordSlug = keywordSlugById.get(p.repair_keyword_id)
    const chain = getAncestorChain(p.region_id, byId)
    if (!keywordSlug || chain.length === 0) continue
    params.push({ keyword: keywordSlug, path: chain.map((r) => r.slug) })
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ keyword: string; path: string[] }>
}) {
  const { keyword: keywordSlug, path } = await params
  const { keywords, pages, regions } = await getAllData()
  const keyword = keywords.find((k) => k.slug === keywordSlug)
  const region = resolveRegionByPath(path, regions)
  if (!keyword || !region) return {}
  const page = pages.find(
    (p) => p.page_type === 'LANDING' && p.repair_keyword_id === keyword.id && p.region_id === region.id,
  )
  return { title: page?.meta_title ?? undefined, description: page?.meta_description ?? undefined }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ keyword: string; path: string[] }>
}) {
  const { keyword: keywordSlug, path } = await params
  const { keywords, categories, pages, regions, localPros, pageImages } = await getAllData()

  const keyword = keywords.find((k) => k.slug === keywordSlug)
  const region = resolveRegionByPath(path, regions)
  if (!keyword || !region) notFound()

  const page = pages.find(
    (p) =>
      p.page_type === 'LANDING' &&
      p.repair_keyword_id === keyword.id &&
      p.region_id === region.id &&
      isPublished(p),
  )
  if (!page) notFound()

  const category = categories.find((c) => c.id === keyword.category_id)
  const { byId } = buildRegionIndex(regions)
  const chain = getAncestorChain(region.id, byId)
  const pathStr = chain.map((r) => r.slug).join('/')
  const upperName = chain
    .slice(0, -1)
    .map((r) => r.display_name)
    .join(' ')

  const guide = page.guide
  const pros = localPros.filter((p) => p.region_id === region.id)
  const mainPro = pros[0]
  const telHref = mainPro ? `tel:${mainPro.phone.replace(/-/g, '')}` : undefined

  const casePage = pages.find(
    (p) =>
      p.page_type === 'CASE' &&
      p.repair_keyword_id === keyword.id &&
      p.region_id === region.id &&
      isPublished(p) &&
      p.slug,
  )

  // ── 거미줄 내부링크용 인덱스 ──
  // 곧 지역 페이지 1,300건 · 키워드 76개다. 페이지 한 장을 그릴 때마다 pages 전체를
  // 블록 수만큼 훑으면 빌드가 터지므로, 요청 스코프에서 인덱스를 한 번만 만들어
  // 아래 네 블록이 함께 쓴다(getAllData 자체는 React.cache로 빌드당 1회).
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
  const chainCache = new Map<number, Region[]>([[region.id, chain]])
  const chainOf = (regionId: number) => {
    const hit = chainCache.get(regionId)
    if (hit) return hit
    const c = getAncestorChain(regionId, byId)
    chainCache.set(regionId, c)
    return c
  }

  // (a) 같은 키워드 · 다른 지역. 조상 체인이 비면 주소를 못 만드니 건너뛴다 —
  //     링크 집합은 generateStaticParams가 만드는 집합과 정확히 같아야 한다.
  const sameKeywordAll = (landingsByKeyword.get(keyword.id) ?? [])
    .filter((p) => p.id !== page.id)
    .map((p) => ({ page: p, chain: chainOf(p.region_id!), region: byId.get(p.region_id!) }))
    .filter((x) => x.chain.length > 0 && x.region)
  const sameKeyword = [...sameKeywordAll]
    .sort((a, b) => {
      // 같은 부모를 둔 형제 지역을 앞에 — 사용자가 실제로 다음에 볼 확률이 가장 높다.
      const as = a.region!.parent_id === region.parent_id ? 0 : 1
      const bs = b.region!.parent_id === region.parent_id ? 0 : 1
      if (as !== bs) return as - bs
      return a.region!.display_name.localeCompare(b.region!.display_name, 'ko')
    })
    .slice(0, 24)

  // (b) 같은 지역 · 다른 키워드. 이 블록이 없으면 키워드끼리는 홈을 거치지 않고는
  //     서로 연결되지 않는다.
  const sameRegion = (landingsByRegion.get(region.id) ?? [])
    .filter((p) => p.repair_keyword_id !== keyword.id)
    .map((p) => ({ page: p, kw: keywordById.get(p.repair_keyword_id!) }))
    .filter((x) => x.kw)
    .sort((a, b) => a.kw!.menu_order - b.kw!.menu_order)
    .slice(0, 12)

  // (c) 상위로 — 조상 지역도 이 키워드로 발행돼 있을 때만 링크한다.
  const myRegionIds = new Set((landingsByKeyword.get(keyword.id) ?? []).map((p) => p.region_id))
  const ancestorLinks = chain
    .slice(0, -1)
    .map((r, i) => ({
      region: r,
      path: chain
        .slice(0, i + 1)
        .map((x) => x.slug)
        .join('/'),
    }))
    .filter((x) => myRegionIds.has(x.region.id))

  // (d) 다른 수리 분야 — 지역 페이지가 많은 순. 이제 모든 키워드에 허브가 생기므로
  //     지역이 0개인 키워드로 링크해도 404가 아니다.
  const otherHubs = keywords
    .filter((k) => k.id !== keyword.id)
    .sort(
      (a, b) =>
        (landingsByKeyword.get(b.id)?.length ?? 0) - (landingsByKeyword.get(a.id)?.length ?? 0) ||
        a.menu_order - b.menu_order,
    )
    .slice(0, 8)

  const seed = `${keyword.slug}/${region.slug}`
  const bg = blueprintBg(category?.slug ?? '', seed)

  // 운영자가 올린 실제 현장 사진이 있으면 대체 이미지를 밀어낸다.
  // 스톡 사진에 걸던 색 변형 필터는 실사에는 적용하지 않는다(원본 그대로 보여야 한다).
  const shots = pageImages
    .filter((i) => i.page_id === page.id && i.role !== 'EXCLUDE')
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)

  // 키워드 사진 상속: 키워드 × 지역 조합이 1,300건이라 조합마다 사진을 따로 넣을 수 없다.
  // 이 페이지 고유 사진이 있으면 그것이 우선하고, 없을 때만 키워드 세트를 물려받는다.
  const inheritedSets =
    shots.length > 0 ? [] : (groupSetsByKeyword(await getKeywordImages()).get(keyword.id) ?? [])

  const pick = (slot: number) => {
    const shot = shots[slot]
    if (shot) {
      return {
        src: shot.url,
        style: undefined,
        label: ROLE_LABEL[shot.role] ?? '현장 사진',
        note: shot.overlay_note,
      }
    }
    const fallback = categoryPhoto(category?.slug ?? '', seed, slot, keyword.display_name)
    return { src: fallback.src, style: fallback.style, label: '참고 이미지', note: null }
  }

  const photoA = pick(0)
  const photoB = pick(1)

  return (
    <main className="pb-24 md:pb-0">
      {/* ── 브레드크럼 ── */}
      <nav aria-label="현재 위치" className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--ink-soft)]">
          <li>
            <Link href="/" className="hover:text-[var(--ink)]">
              수리위키
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href={`/${keyword.slug}`} className="hover:text-[var(--ink)]">
              {keyword.display_name}
            </Link>
          </li>
          {chain.map((r) => (
            <li key={r.id} className="flex items-center gap-1.5">
              <span aria-hidden>›</span>
              <span className={r.id === region.id ? 'font-bold text-[var(--ink)]' : ''}>
                {r.display_name}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── 히어로 + 진단 카드 ── */}
      <section className="relative mt-4 border-y border-[var(--line)] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: bg }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div>
            <p className="eyebrow">
              {upperName || keyword.display_name} · {region.display_name}
            </p>
            <h1 className="font-serif-kr mt-3 text-3xl font-black leading-[1.25] sm:text-4xl">
              {region.display_name} {keyword.display_name}
            </h1>
            <p className="prose-kr mt-5 max-w-xl text-[15px] text-[var(--ink-soft)]">
              {guide ? guide.summary : keyword.description ?? `${region.display_name} 지역 ${keyword.display_name} 출장 안내 페이지입니다.`}
            </p>

            {region.housing_characteristics && (
              <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--teal-soft)]/60 p-4 text-sm">
                <span className="font-bold text-[var(--teal)]">
                  {region.display_name} 주거 특성
                </span>
                <p className="mt-1 text-[var(--ink-soft)]">{region.housing_characteristics}</p>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {telHref && (
                <a href={telHref} className="btn-call">
                  <PhoneIcon />
                  {mainPro!.phone} 상담
                </a>
              )}
              {casePage?.slug && (
                <Link href={`/case/${casePage.slug}`} className="btn-ghost">
                  이 동네 시공 기록 보기
                </Link>
              )}
            </div>
            <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
              <span className="font-bold text-[var(--copper)]">안내</span> 작업 중에는 전화
              연결이 어려우니, 사진과 지역·수리 내용을 문자로 남겨 주시면 확인 후 안내드립니다.
            </p>
          </div>

          {/* 사진 + 진단 체크카드 */}
          <div className="space-y-5 self-start">
            {inheritedSets.length > 0 ? (
              <div>
                <BeforeAfterSlider
                  sets={inheritedSets}
                  alt={`${keyword.display_name} 시공 전후 사진`}
                />
                <p className="mt-2 text-[13px] text-[var(--ink-soft)]">
                  {keyword.display_name} 실제 시공 전 · 후 사진입니다. 손잡이를 좌우로 움직여
                  비교해 보세요.
                </p>
              </div>
            ) : (
              <div className="hero-photo aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoA.src}
                  alt={photoA.note ?? `${keyword.display_name} ${photoA.label}`}
                  style={photoA.style}
                  loading="eager"
                />
                <span className="tag">{photoA.label}</span>
              </div>
            )}
          {guide && guide.symptoms.length > 0 && (
            <aside className="diag-card rounded-2xl p-6" aria-labelledby="diag-title">
              <p className="eyebrow">Self Check</p>
              <h2 id="diag-title" className="mt-1 text-lg font-extrabold">
                이런 증상이면 의심하세요
              </h2>
              <ul className="mt-4 space-y-3.5">
                {guide.symptoms.map((s, i) => (
                  <li key={i} className="diag-item text-[15px] leading-snug">
                    <span aria-hidden className="diag-box" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-[var(--ink-soft)]">
                한 가지라도 해당된다면, 진행이 빠른 초기에 사진 상담을 권합니다.
              </p>
            </aside>
          )}
          </div>
        </div>
      </section>

      {/* ── 표준 시공 절차 ── */}
      {guide && guide.steps.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="eyebrow">Process</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-[1.7rem]">
            표준 시공 절차
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {region.display_name} 현장에서 실제로 진행되는 순서입니다.
          </p>

          <div className="hero-photo mt-6 aspect-[16/7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoB.src} alt={photoB.note ?? ''} style={photoB.style} loading="lazy" />
            <span className="tag">{photoB.label}</span>
          </div>

          <ol className="step-rail mt-8 space-y-7">
            {guide.steps.map((step) => (
              <li key={step.num} className="flex gap-4">
                <span className="step-num" aria-hidden>
                  {String(step.num).padStart(2, '0')}
                </span>
                <div className="pt-1">
                  <h3 className="font-extrabold">{step.title}</h3>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">{step.desc}</p>
                  {step.tip && (
                    <p className="step-tip mt-2.5 rounded-r-lg px-3.5 py-2.5 text-[13px] font-medium">
                      <span className="font-extrabold">현장 팁</span> · {step.tip}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── 자가수리 vs 전문가 ── */}
      {page.diy_vs_pro && (
        <section className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl bg-[var(--ink)] p-6 text-[var(--paper)] sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#e8b34c]">
              직접 할까, 맡길까
            </p>
            <p className="prose-kr mt-3 text-[15px] leading-relaxed text-[#d7dde0]">
              {page.diy_vs_pro}
            </p>
          </div>
        </section>
      )}

      {/* ── 재발 방지 ── */}
      {guide && guide.prevention_tips.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="eyebrow">Prevention</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">시공 후 재발 방지</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-1">
            {guide.prevention_tips.map((tip, i) => (
              <li key={i} className="card flex gap-3 p-4 text-sm">
                <span aria-hidden className="mt-0.5 font-black text-[var(--teal)]">
                  ✓
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 시공 기록 발췌 ── */}
      {casePage?.slug && (
        <section className="border-y border-[var(--line)] bg-white">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <p className="eyebrow">Field Record</p>
            <h2 className="font-serif-kr mt-2 text-2xl font-black">이 동네 실제 시공 기록</h2>
            <Link
              href={`/case/${casePage.slug}`}
              className="card group mt-6 flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-lg"
            >
              <div>
                <h3 className="font-extrabold leading-snug">{casePage.meta_title}</h3>
                <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                  문제 → 판단 → 작업 → 검측 결과, 현장 순서 그대로 기록했습니다.
                </p>
              </div>
              <span
                aria-hidden
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-[var(--line)] text-[var(--copper)] group-hover:border-[var(--copper)]"
              >
                →
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {guide && guide.faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="eyebrow">FAQ</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">자주 묻는 질문</h2>
          <div className="mt-6">
            {guide.faqs.map((f, i) => (
              <details key={i} className="faq">
                <summary>{f.q}</summary>
                <div className="text-sm">{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ── 지역 마스터 ── */}
      {pros.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
          <p className="eyebrow">Local Masters</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">
            {region.display_name} 담당 마스터
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {pros.map((pro) => (
              <div key={pro.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold">{pro.shop_name ?? `${region.display_name} 담당 마스터`}</h3>
                  </div>
                  {pro.master_grade && (
                    <span className="rounded-full bg-[var(--teal-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--teal)]">
                      {pro.master_grade}
                    </span>
                  )}
                </div>
                {pro.distance && (
                  <p className="mt-2 text-[13px] text-[var(--ink-soft)]">📍 {pro.distance}</p>
                )}
                {pro.badges.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {pro.badges.map((b, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-soft)]"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                <a
                  href={`tel:${pro.phone.replace(/-/g, '')}`}
                  className="btn-call mt-4 w-full !py-2.5 text-sm"
                >
                  <PhoneIcon />
                  {pro.phone}
                </a>
              </div>
            ))}
          </div>
          {page.area_served && (
            <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
              출장 지역 · {page.area_served}
            </p>
          )}
        </section>
      )}

      {/* ── 거미줄 내부링크 ── */}
      <section className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="eyebrow">Related</p>
          <h2 className="font-serif-kr mt-2 text-xl font-black">이어서 볼 페이지</h2>

          {/* (a) 같은 키워드 · 다른 지역 */}
          {sameKeyword.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-extrabold">{keyword.display_name} · 다른 지역</h3>
              <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
                안내 중인 {sameKeywordAll.length + 1}개 지역 중 {sameKeyword.length}곳입니다.
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sameKeyword.map((x) => {
                  const dong = x.chain[x.chain.length - 1]
                  const upper = x.chain
                    .slice(0, -1)
                    .map((r) => r.display_name)
                    .join(' ')
                  return (
                    <li key={x.page.id}>
                      <Link
                        href={`/${keyword.slug}/${x.chain.map((r) => r.slug).join('/')}`}
                        className={ROW}
                      >
                        <span className="text-sm">
                          <b>{dong.display_name}</b>{' '}
                          <span className="text-[var(--ink-soft)]">{upper}</span>
                        </span>
                        <span aria-hidden className="text-[var(--copper)]">
                          →
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {sameKeywordAll.length > sameKeyword.length && (
                <Link
                  href={`/${keyword.slug}`}
                  className="mt-3 inline-block text-sm font-bold text-[var(--teal)] hover:underline"
                >
                  {keyword.display_name} 전체 지역 보기 →
                </Link>
              )}
            </div>
          )}

          {/* (b) 같은 지역 · 다른 키워드 */}
          {sameRegion.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-extrabold">
                {region.display_name}에서 함께 가능한 수리
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sameRegion.map(({ page: p, kw }) => (
                  <li key={p.id}>
                    <Link href={`/${kw!.slug}/${pathStr}`} className={ROW}>
                      <span className="text-sm">
                        <b>{kw!.display_name}</b>{' '}
                        <span className="text-[var(--ink-soft)]">{region.display_name}</span>
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

          {/* (c) 상위로 */}
          <div className="mt-8">
            <h3 className="text-sm font-extrabold">상위 페이지</h3>
            <ul className="mt-3 flex flex-wrap gap-2.5">
              <li>
                <Link
                  href={`/${keyword.slug}`}
                  className="inline-block rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
                >
                  {keyword.display_name} 전체
                </Link>
              </li>
              {ancestorLinks.map((a) => (
                <li key={a.region.id}>
                  <Link
                    href={`/${keyword.slug}/${a.path}`}
                    className="inline-block rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
                  >
                    {a.region.display_name} {keyword.display_name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* (d) 다른 수리 분야 */}
          {otherHubs.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-extrabold">다른 수리 항목</h3>
              <ul className="mt-3 flex flex-wrap gap-2.5">
                {otherHubs.map((k) => (
                  <li key={k.id}>
                    <Link
                      href={`/${k.slug}`}
                      className="inline-block rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
                    >
                      {k.display_name}
                      <span className="ml-1.5 text-[11px] font-semibold text-[var(--ink-soft)]">
                        {landingsByKeyword.get(k.id)?.length ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
                숫자는 해당 항목에서 안내 중인 지역 수입니다. ·{' '}
                <Link href="/" className="font-bold text-[var(--teal)] hover:underline">
                  전체 수리 항목 보기
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── 모바일 고정 상담바 ── */}
      {mainPro && telHref && (
        <div className="callbar">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">
              {region.display_name} {keyword.display_name}
            </p>
            <p className="truncate text-[11px] text-[#aeb9be]">사진·문자 상담 환영</p>
          </div>
          <a href={telHref} className="btn-call flex-none !px-4 !py-2 text-sm">
            <PhoneIcon />
            전화 상담
          </a>
        </div>
      )}
    </main>
  )
}

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
