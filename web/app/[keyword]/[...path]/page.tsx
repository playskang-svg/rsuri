import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getAllData, isPublished } from '@/lib/supabase'
import { resolveRegionByPath, buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'
import { categoryPhoto } from '@/lib/photos'
import { getKeywordImages, groupSetsByKeyword } from '@/lib/keyword-images'
import { composeLocal } from '@/lib/compose-local'
import { fallbackPhone, telHrefOf } from '@/lib/contact'
import { BeforeAfterSlider } from '@/app/_components/BeforeAfterSlider'
import { HeroSlider } from '@/app/_components/HeroSlider'
import { FloatingActions } from '@/app/_components/FloatingActions'
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

  // 본문은 두 층에서 온다. kc(키워드 자산)는 이 키워드의 모든 지역 페이지가 공유하고,
  // local(지역 변주)은 이 페이지에만 있는 글이다. guide는 초기 CASE 기반 6개 페이지에만
  // 있는 1세대 본문 — 더 깊은 내용이라 있으면 그쪽을 우선한다.
  const kc = keyword.content
  // 손으로 쓴 본문이 있으면 그것이 이기고, 없으면 지역 프로필 + 키워드 문장 풀로 조립한다.
  const local =
    page.local ?? composeLocal(keyword.slug, region.display_name, region.profile, kc?.local_pool ?? null)
  const guide = page.guide

  // 증상 체크리스트 · 절차 · FAQ는 두 세대가 같은 자리를 두고 겹친다. 어느 쪽을 쓸지
  // 여기서 한 번만 정해 두고 아래 JSX는 결과만 쓴다.
  const symptoms = guide?.symptoms?.length ? guide.symptoms : (kc?.symptoms ?? [])
  const steps = guide?.steps?.length
    ? guide.steps
    : (kc?.process ?? []).map((c, i) => ({ num: i + 1, title: c.title, desc: c.desc, tip: null }))
  // 지역 FAQ가 맨 앞 — 벤치마크도 "○○구 어디까지 출장 가능한가요?"를 첫 문항에 둔다.
  // 이 페이지에서만 답이 달라지는 유일한 문항이라 검색 의도에 가장 가깝다.
  const faqs = [
    ...(local?.region_faq ? [local.region_faq] : []),
    ...(guide?.faqs?.length ? guide.faqs : (kc?.faqs ?? [])),
  ]

  const pros = localPros.filter((p) => p.region_id === region.id)
  const mainPro = pros[0]
  // 담당 마스터가 지정된 지역은 7곳뿐이다. 나머지 지역에서 전화번호가 통째로 사라지면
  // 전환 경로가 없는 페이지가 되므로 대표 번호로 떨어뜨린다.
  const phone = mainPro?.phone ?? keyword.default_phone ?? fallbackPhone(localPros)
  const telHref = telHrefOf(phone)

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

  // 히어로 배경 슬라이드. 운영자가 올린 실사가 있으면 그것만 돌리고,
  // 없을 때만 키워드 주제에 맞는 참고 이미지를 여러 장 뽑아 쓴다.
  const heroImages =
    shots.length > 0
      ? shots.slice(0, 4).map((sh) => ({ src: sh.url }))
      : [0, 1, 2].map((slot) => {
          const ph = categoryPhoto(category?.slug ?? '', seed, slot, keyword.display_name)
          return { src: ph.src, style: ph.style }
        })

  return (
    <main className="pb-24 md:pb-0">
      {/* ── 히어로 (풀블리드 사진 + 오버레이) ──
          사진을 오른쪽 칸에 가둬 두면 첫 화면이 텍스트 덩어리로 보인다. 배경으로 깔고
          그 위에 지역+키워드를 크게 얹어, 스크롤 전에 "어디서 무슨 수리"인지가 끝나게 한다. */}
      <section className="relative isolate overflow-hidden bg-[var(--ink)]">
        <HeroSlider
          images={heroImages}
          alt={`${region.display_name} ${keyword.display_name} 시공 현장`}
        />
        {/* 사진 위 글자의 대비를 고정한다 — 어떤 사진이 와도 읽히게. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[rgba(16,24,28,0.92)] via-[rgba(16,24,28,0.78)] to-[rgba(16,24,28,0.45)]"
        />
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <nav aria-label="현재 위치">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#aeb9be]">
              <li>
                <Link href="/" className="hover:text-white">
                  홈
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li>
                <Link href={`/${keyword.slug}`} className="hover:text-white">
                  {keyword.display_name}
                </Link>
              </li>
              {chain.map((r) => (
                <li key={r.id} className="flex items-center gap-1.5">
                  <span aria-hidden>›</span>
                  <span className={r.id === region.id ? 'font-bold text-white' : ''}>
                    {r.display_name}
                  </span>
                </li>
              ))}
            </ol>
          </nav>

          <p className="mt-5 inline-block rounded-full border border-[#e8b34c]/60 px-4 py-1.5 text-[13px] font-extrabold text-[#e8b34c]">
            {region.display_name} {keyword.display_name} 출장 시공
          </p>

          <h1 className="font-serif-kr mt-4 text-4xl font-black leading-[1.15] text-white sm:text-5xl">
            {region.display_name} {keyword.display_name}
          </h1>

          <p className="prose-kr mt-5 max-w-2xl text-[15px] leading-relaxed text-[#d7dde0] sm:text-base">
            {region.profile?.dongs && `${region.profile.dongs} 등 전 동 출장 ${region.display_name} ${keyword.display_name}. `}
            {local?.hero_line ??
              guide?.summary ??
              kc?.tagline ??
              keyword.description ??
              `${region.display_name} 지역 ${keyword.display_name} 출장 안내입니다.`}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {telHref && (
              <a
                href={telHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-extrabold text-[var(--ink)] transition-transform hover:scale-[1.03]"
              >
                <PhoneIcon />
                {phone} 상담문의
              </a>
            )}
            <Link
              href={`/${keyword.slug}`}
              className="inline-flex items-center rounded-full border border-white/45 px-6 py-3 text-[15px] font-extrabold text-white hover:border-white"
            >
              {keyword.display_name} 전체 지역
            </Link>
          </div>

          <p className="mt-5 text-[13px] text-[#aeb9be]">
            작업 중에는 전화 연결이 어려우니, 사진과 지역·수리 내용을 문자로 남겨 주시면 확인 후
            안내드립니다.
          </p>
        </div>
      </section>

      {/* ── 이런 증상이면 + 이런 걸 고칩니다 ──
          히어로에서 밀려난 자가진단 카드. 사진 배경 위에 두면 체크리스트가 안 읽힌다. */}
      {(symptoms.length > 0 || (kc && kc.services.length > 0)) && (
        <section className="border-b border-[var(--line)] bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
            {symptoms.length > 0 && (
              <div className="diag-card rounded-2xl p-6">
                <p className="eyebrow">Self Check</p>
                <h2 className="font-serif-kr mt-2 text-2xl font-black">
                  이런 증상이면 {region.display_name} {keyword.display_name}가 필요합니다
                </h2>
                <ul className="mt-5 space-y-3.5">
                  {symptoms.map((s, i) => (
                    <li key={i} className="diag-item text-[15px] leading-snug">
                      <span aria-hidden className="diag-box" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-[var(--ink-soft)]">
                  한 가지라도 해당된다면, 진행이 빠른 초기에 사진 상담을 권합니다.
                </p>
              </div>
            )}
            {kc && kc.services.length > 0 && (
              <div className="self-start rounded-2xl border border-[var(--line)] p-6">
                <p className="eyebrow">What We Fix</p>
                <h2 className="font-serif-kr mt-2 text-2xl font-black">
                  {region.display_name} {keyword.display_name}, 이런 걸 고칩니다
                </h2>
                <ul className="mt-5 space-y-3">
                  {kc.services.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span aria-hidden className="mt-0.5 font-black text-[var(--teal)]">
                        ·
                      </span>
                      <span className="text-[15px] leading-snug">
                        <b>{s.title}</b>{' '}
                        <span className="text-[var(--ink-soft)]">{s.desc}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 시공 사례 (전/후) ──
          실제 사진이 등록된 키워드에서만 나온다. 스톡 사진으로는 전후 비교가 성립하지
          않으므로(같은 현장이 아니다) 사진이 없으면 이 섹션 자체를 만들지 않는다. */}
      {inheritedSets.length > 0 && (
        <section id="cases" className="scroll-mt-20 border-b border-[var(--line)] bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <Pill>CASES</Pill>
            <h2 className="font-serif-kr mt-4 text-3xl font-black sm:text-[2.1rem]">
              {region.display_name} {keyword.display_name} 전후사진
            </h2>
            <p className="mt-3 text-[15px] text-[var(--ink-soft)]">
              전·후를 나란히 놓아 시공 결과를 한눈에 비교하실 수 있습니다.
            </p>
            {/* 슬라이더로 겹쳐 두면 한 번에 한 장만 보여 비교가 안 된다 — 나란히 건다. */}
            <ul className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {inheritedSets.map((set) => (
                <li
                  key={set.setNo}
                  className="overflow-hidden rounded-lg border border-[var(--line)] bg-white"
                >
                  <div className="grid grid-cols-2">
                    {([['BEFORE', set.before], ['AFTER', set.after]] as const).map(
                      ([label, src]) =>
                        src && (
                          <div key={label} className="relative aspect-[3/4] overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`${keyword.display_name} 시공 ${label === 'BEFORE' ? '전' : '후'}`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--ink)]/85 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-[#e8b34c]">
                              {label}
                            </span>
                          </div>
                        ),
                    )}
                  </div>
                  {set.caption && (
                    <div className="p-5">
                      <p className="text-[15px] font-extrabold">{set.caption}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── AREA · 핵심 포인트 ──
          지역 페이지가 서로 다른 글이 되는 첫 번째 자리. 같은 키워드라도 동네마다
          실제로 들어오는 의뢰 유형이 다르다. 앞의 3개만 카드로 크게 세우고,
          나머지는 아래 "자주 발생하는 상황" 목록이 받는다. */}
      {local && local.top_requests.length > 0 && (
        <section className="border-y border-[var(--line)] bg-[var(--paper)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <Pill>AREA</Pill>
            <h2 className="font-serif-kr mt-4 text-3xl font-black sm:text-[2.1rem]">
              {region.display_name} {keyword.display_name}의 핵심 포인트
            </h2>
            <p className="mt-3 text-[15px] text-[var(--ink-soft)]">
              시공 전 미리 알아두면 좋은 부분을 정리했습니다.
            </p>
            <ul className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {local.top_requests.slice(0, 3).map((r, i) => (
                <li key={i} className="rounded-lg border border-[var(--line)] bg-white p-7">
                  <h3 className="text-lg font-extrabold">{r.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)]">
                    {r.desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 지역 롱폼 본문 ──
          검색 엔진이 이 페이지를 "지역명만 바꾼 복붙"이 아니라고 판단하는 근거가 되는 본문.
          소제목마다 지역+키워드를 붙인다 — 목차만 훑어도 이 페이지가 무엇에 대한 글인지
          드러나야 하고, 그게 곧 타겟 키워드다. */}
      {local && (
        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <p className="prose-kr text-[17px] font-bold leading-relaxed">{local.longform.lead}</p>

            {local.longform.sections.map((s, i) => (
              <div key={i} className="mt-12">
                <h3 className="font-serif-kr text-xl font-black sm:text-2xl">
                  {region.display_name} {keyword.display_name} — {s.title}
                </h3>
                <hr className="mt-3 border-[var(--line)]" />
                <p className="prose-kr mt-5 text-[15px] leading-relaxed text-[var(--ink-soft)]">
                  {s.body}
                </p>
                {/* 첫 소제목 아래에만 상황 목록을 붙인다. 문단마다 반복하면 목록이 본문을 덮는다. */}
                {i === 0 && local.top_requests.length > 3 && (
                  <ul className="mt-6 space-y-2.5">
                    {local.top_requests.slice(3).map((r, j) => (
                      <li
                        key={j}
                        className="flex gap-3 rounded-lg bg-[var(--paper)] px-5 py-3.5 text-[15px]"
                      >
                        <span aria-hidden className="font-black text-[var(--copper)]">
                          ✔
                        </span>
                        <span>
                          <b>{r.title}</b>{' '}
                          <span className="text-[var(--ink-soft)]">— {r.desc}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* 본문을 다 읽은 사람이 갈 곳을 만들어 준다 — 여기서 끊기면 이탈이다. */}
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border-l-4 border-[var(--ink)] bg-[var(--paper)] px-6 py-6">
              <div>
                <p className="text-[15px] text-[var(--ink-soft)]">다른 지역도 함께 보세요</p>
                <p className="mt-1 font-bold">
                  {keyword.display_name} 지역별 안내를 한 번에 확인하실 수 있습니다.
                </p>
              </div>
              <Link
                href={`/${keyword.slug}`}
                className="inline-flex flex-none items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3 text-[15px] font-extrabold text-[var(--paper)]"
              >
                {keyword.display_name} 전체 →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 서비스 안내 (키워드 자산) ── */}
      {kc && kc.services.length > 0 && (
        <section id="services" className="scroll-mt-20 mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <Pill>SERVICE</Pill>
          <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-[1.7rem]">
            {region.display_name} {keyword.display_name} 세부 항목
          </h2>
          <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kc.services.map((s, i) => (
              <li key={i} className="card p-5">
                <h3 className="font-extrabold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{s.desc}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 표준 시공 절차 ── */}
      {steps.length > 0 && (
        <section id="process" className="scroll-mt-20 mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <Pill>PROCESS</Pill>
          <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-[1.7rem]">
            {region.display_name} {keyword.display_name} 진행 절차
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
            {steps.map((step) => (
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
          <h2 className="font-serif-kr mt-2 text-2xl font-black">
            {region.display_name} 시공 후 관리·재발 방지
          </h2>
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

      {/* ── 전문 업체가 유리한 이유 (키워드 자산) ── */}
      {kc && kc.why_pro.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
          <p className="eyebrow">Why Pro</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">
            {region.display_name} {keyword.display_name}, 전문 업체가 유리한 이유
          </h2>
          <ul className="mt-6 grid gap-3">
            {kc.why_pro.map((r, i) => (
              <li key={i} className="card flex gap-3 p-4 text-sm">
                <span aria-hidden className="mt-0.5 font-black text-[var(--copper)]">
                  ✓
                </span>
                <span>{r}</span>
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
            <h2 className="font-serif-kr mt-2 text-2xl font-black">
              {region.display_name} {keyword.display_name} 시공 기록
            </h2>
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
      {faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <Pill>FAQ</Pill>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">
            {region.display_name} {keyword.display_name} 자주 묻는 질문
          </h2>
          <div className="mt-6">
            {faqs.map((f, i) => (
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
            {region.display_name} {keyword.display_name} 담당 마스터
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
          <h2 className="font-serif-kr mt-2 text-xl font-black">관련 서비스 페이지</h2>

          {/* (a) 같은 키워드 · 다른 지역 */}
          {sameKeyword.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-extrabold">{keyword.display_name} · 다른 지역</h3>
              <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
                가까운 동네부터 보여드립니다.
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

          {/* (b) 같은 지역 · 다른 키워드 — 이동해도 같은 틀에 키워드·내용만 바뀐 페이지가 나온다.
                 지금 보고 있는 페이지를 맨 앞에 배지로 세워, 어디에서 어디로 가는지 보이게 한다. */}
          {sameRegion.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-extrabold">
                {region.display_name}에서 함께 가능한 수리
              </h3>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* 첫 칸은 지금 보고 있는 페이지. 링크가 아니라 현재 위치 표시다 —
                    어디에서 어디로 가는지 보여야 옆 카드를 누를 이유가 생긴다. */}
                <li>
                  <div className="card overflow-hidden border-[var(--ink)]">
                    <div className="relative aspect-[16/9] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoA.src}
                        alt=""
                        style={photoA.style}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-[var(--ink)] px-3 py-1 text-[11px] font-extrabold text-white">
                        현재 페이지
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-base font-extrabold">
                        {region.display_name} {keyword.display_name}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--ink-soft)]">
                        {kc?.tagline ?? keyword.description ?? ''}
                      </p>
                    </div>
                  </div>
                </li>
                {sameRegion.map(({ page: p, kw }) => {
                  const ph = categoryPhoto(
                    categories.find((c) => c.id === kw!.category_id)?.slug ?? '',
                    `${kw!.slug}/${region.slug}`,
                    0,
                    kw!.display_name,
                  )
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/${kw!.slug}/${pathStr}`}
                        className="card group block overflow-hidden transition-shadow hover:shadow-xl"
                      >
                        <div className="aspect-[16/9] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ph.src}
                            alt=""
                            style={ph.style}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-base font-extrabold">
                            {region.display_name} {kw!.display_name}
                          </p>
                          <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--ink-soft)]">
                            {kw!.content?.tagline ?? kw!.description ?? ''}
                          </p>
                          <p className="mt-3 text-[13px] font-extrabold text-[var(--copper)]">
                            바로가기 →
                          </p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
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
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
                <Link href="/" className="font-bold text-[var(--teal)] hover:underline">
                  전체 수리 항목 보기
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── 최하단 CTA 밴드 ──
          본문을 끝까지 읽은 사람이 마지막으로 만나는 화면이다. 여기서 아무 것도 제시하지
          않으면 그대로 닫는다. */}
      <section className="bg-[var(--ink)]">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-serif-kr text-2xl font-black text-white sm:text-3xl">
            {keyword.display_name} 상태 사진 한 장이면 충분합니다
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#aeb9be]">
            현장 상태에 맞춰 시공 가능 여부와 일정을 안내드립니다. 작업 중에는 통화가 어려우니
            사진과 지역, 수리 내용을 남겨 주세요.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {telHref && (
              <a
                href={telHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-extrabold text-[var(--ink)] transition-transform hover:scale-[1.03]"
              >
                <PhoneIcon />
                {phone} 상담문의
              </a>
            )}
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/45 px-7 py-3.5 text-[15px] font-extrabold text-white hover:border-white"
            >
              메인페이지
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[13px] text-[#8f9ba1]">
            <li>{region.display_name} 전 지역 출장</li>
            <li>진단부터 마감까지 한 번에</li>
            <li>사진·문자 상담 환영</li>
          </ul>
        </div>
      </section>

      {/* ── 사이트맵 ── */}
      {(sameRegion.length > 0 || otherHubs.length > 0) && (
        <section id="sitemap" className="scroll-mt-20 border-t border-[var(--line)] bg-[var(--paper)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <Pill>SITEMAP</Pill>
            <h2 className="font-serif-kr mt-4 text-2xl font-black sm:text-3xl">
              {region.display_name}에서 볼 수 있는 페이지
            </h2>
            <p className="mt-3 text-[15px] text-[var(--ink-soft)]">
              아래 페이지들이 서로 연결되어 있습니다. 필요한 정보로 바로 이동해 보세요.
            </p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sameRegion.map(({ page: p, kw }) => (
                <li key={p.id}>
                  <Link
                    href={`/${kw!.slug}/${pathStr}`}
                    className="block truncate rounded-md border border-[var(--line)] bg-white px-5 py-4 text-[15px] font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
                  >
                    {region.display_name} {kw!.display_name}
                  </Link>
                </li>
              ))}
              {otherHubs.slice(0, 6).map((k) => (
                <li key={`hub-${k.id}`}>
                  <Link
                    href={`/${k.slug}`}
                    className="block truncate rounded-md border border-[var(--line)] bg-white px-5 py-4 text-[15px] font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]"
                  >
                    {k.display_name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <FloatingActions telHref={telHref} />

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

/** 섹션 머리의 영문 라벨 알약. eyebrow(민무늬 소문자)보다 구획이 또렷하다. */
function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-[var(--copper)]/40 bg-[var(--copper)]/10 px-4 py-1.5 text-[12px] font-extrabold tracking-[0.14em] text-[var(--copper)]">
      {children}
    </span>
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
