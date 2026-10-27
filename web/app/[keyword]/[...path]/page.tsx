import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { getAllData, isPublished } from '@/lib/supabase'
import { resolveRegionByPath, buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'
import { keywordPhoto, keywordPhotos } from '@/lib/photos'
import { josa } from '@/lib/josa'
import { getKeywordImages, groupSetsByKeyword, isIllustrationOnly } from '@/lib/keyword-images'
import { composeLocal } from '@/lib/compose-local'
import { fallbackPhone, telHrefOf } from '@/lib/contact'
import { BeforeAfterSlider } from '@/app/_components/BeforeAfterSlider'
import { HeroSlider } from '@/app/_components/HeroSlider'
import { FloatingActions } from '@/app/_components/FloatingActions'
import { SectionHead } from '@/app/_components/PageHero'
import type { Page, PageImageRole, Region } from '@/lib/types'
// 이 페이지 전용 스타일(lp-*). 공용 globals.css는 건드리지 않는다.
import '../../_styles/landing.css'

const ROLE_LABEL: Record<PageImageRole, string> = {
  BEFORE: '시공 전',
  PROCESS: '시공 중',
  AFTER: '시공 후',
  MATERIAL: '사용 자재',
  TOOL: '사용 장비',
  EXCLUDE: '',
}

const firstDongs = (dongs: string, n: number) => dongs.split('·').slice(0, n).join('·')

// 등장 효과 stagger의 자식 순번(--i). 지연 간격은 globals.css가 정한다.
const nth = (i: number) => ({ ['--i' as string]: i }) as CSSProperties

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
  const activeModules = new Set(page.module_order)
  const hasModule = (code: string) => activeModules.has(code)
  const regionDisplayText =
    hasModule('M28') &&
    region.profile?.verification_status === 'verified' &&
    region.profile.display_text
      ? region.profile.display_text
      : null

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
    .slice(0, 6)

  // 권역별 접이식 색인용 묶음. 형제 링크를 본문에 다 깔면 페이지를 잡아먹고, 6개만
  // 남기면 나머지가 크롤러에서 끊긴다. 접어 두면 화면은 한 줄, HTML에는 전부 남는다.
  const CLUSTER_OF: Record<string, string> = {
    'seoul-gangnam': '서울',
    'seoul-apt': '서울',
    'seoul-old': '서울',
    newtown1: '경기',
    newtown2: '경기',
    'gyeonggi-mixed': '경기',
    incheon: '인천',
    province: '그 외 지역',
  }
  const CLUSTER_ORDER = ['서울', '경기', '인천', '그 외 지역']
  const byCluster = new Map<string, { name: string; href: string }[]>()
  for (const x of [...sameKeywordAll].sort((a, b) =>
    a.region!.display_name.localeCompare(b.region!.display_name, 'ko'),
  )) {
    const cluster = CLUSTER_OF[x.region!.profile?.type ?? ''] ?? '그 외 지역'
    const entry = {
      name: x.region!.display_name,
      href: `/${keyword.slug}/${x.chain.map((r) => r.slug).join('/')}`,
    }
    const list = byCluster.get(cluster)
    if (list) list.push(entry)
    else byCluster.set(cluster, [entry])
  }

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
  // 실사가 아직 없어 개념도로 채운 세트인지. 사진으로 오인되면 안 되므로 화면에 밝힌다 —
  // 남의 현장 사진을 우리 시공 결과처럼 쓰는 것과 같은 종류의 문제를 여기서 차단한다.
  const casesAreIllustration = inheritedSets.length > 0 && isIllustrationOnly(inheritedSets)

  // 사진 칸은 이 키워드와 맞는 실사만 채운다. 없으면 null — 그 칸을 통째로 뺀다.
  // (예전 Unsplash 참고 이미지는 수리 내용과 안 맞아 2026-09-11 걷어냈다. lib/photos.ts)
  const pick = (slot: number) => {
    const shot = shots[slot]
    if (shot) {
      return { src: shot.url, label: ROLE_LABEL[shot.role] ?? '현장 사진', note: shot.overlay_note }
    }
    const src = keywordPhoto(keyword.slug, seed, slot)
    return src ? { src, label: '현장 사진', note: null } : null
  }

  const photoA = pick(0)
  const photoB = pick(1)

  // 히어로 사진 슬라이드. 페이지 고유 실사 → 키워드 실사 순. 둘 다 없으면 글만 둔다.
  const heroImages =
    shots.length > 0
      ? shots.slice(0, 4).map((sh) => ({ src: sh.url }))
      : keywordPhotos(keyword.slug).map((src) => ({ src }))

  // 섹션 번호 — 모듈 조합마다 보이는 섹션이 달라 미리 정해 둘 수 없다. 아래 JSX가 실제로
  // 그리는 순서대로 01부터 매긴다(서버에서 위에서 아래로 한 번 평가되므로 평가 순서가 곧 화면 순서다).
  let secNo = 0
  const nextNo = () => String(++secNo).padStart(2, '0')

  return (
    <main>
      {/* ── 히어로 — 차콜 면 + 블루프린트 그리드, 옆 칸(모바일은 위) 실사 ──
          지역+키워드를 크게 올려 스크롤 전에 "어디서 무슨 수리"인지가 끝나게 한다.
          사진은 글자 뒤 배경이 아니라 옆 칸이라 어둡게 덮는 그라데이션이 필요 없다.
          첫 화면이라 등장 효과(data-reveal)를 걸지 않는다. */}
      <section className="page-hero lp-hero" data-tone="dark" data-module="M01">
        <div className={`hero-inner ${heroImages.length > 0 ? 'photo-first' : 'solo'}`}>
          <div className="min-w-0">
            {/* 브레드크럼이 곧 이동 장치다. 두 세그먼트를 열면 사촌(같은 지역 다른 수리)과
                형제(같은 수리 다른 지역)로 바로 건너뛴다 — 본문에 링크를 깔지 않고도
                페이지끼리 얽히게 만드는 자리이고, 화면은 한 줄만 쓴다. */}
            <nav aria-label="현재 위치" className="lp-crumbs">
              <ol className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--on-ink-soft)]">
                <li>
                  <Link href="/" className="hover:text-[var(--on-ink)]">
                    홈
                  </Link>
                </li>
                <li aria-hidden>›</li>
                <li>
                  {sameRegion.length > 0 ? (
                    <details className="crumb-drop">
                      <summary className="font-medium hover:text-[var(--on-ink)]">
                        {keyword.display_name}
                      </summary>
                      <div className="crumb-panel">
                        <Link href={`/${keyword.slug}`}>{keyword.display_name} 전체 지역</Link>
                        {sameRegion.map(({ page: p, kw }) => (
                          <Link key={p.id} href={`/${kw!.slug}/${pathStr}`}>
                            {region.display_name} {kw!.display_name}
                          </Link>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <Link href={`/${keyword.slug}`} className="hover:text-[var(--on-ink)]">
                      {keyword.display_name}
                    </Link>
                  )}
                </li>
                {chain.slice(0, -1).map((r) => (
                  <li key={r.id} className="flex items-center gap-1.5">
                    <span aria-hidden>›</span>
                    <span>{r.display_name}</span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5">
                  <span aria-hidden>›</span>
                  {sameKeywordAll.length > 0 ? (
                    <details className="crumb-drop">
                      <summary className="font-bold text-[var(--on-ink)]">{region.display_name}</summary>
                      <div className="crumb-panel">
                        {sameKeywordAll.slice(0, 60).map((x) => (
                          <Link
                            key={x.page.id}
                            href={`/${keyword.slug}/${x.chain.map((r) => r.slug).join('/')}`}
                          >
                            {x.region!.display_name} {keyword.display_name}
                          </Link>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <span className="font-bold text-[var(--on-ink)]">{region.display_name}</span>
                  )}
                </li>
              </ol>
            </nav>

            {/* 옛 영문 라벨(Local Service /) 대신 분야 이름 — 한국어 모노 라벨 */}
            <p className="label-mono mt-5">
              {category ? `${category.display_name} · ` : ''}
              {region.display_name} {keyword.display_name} 출장 시공
            </p>

            <h1>
              {region.display_name}
              <br />
              {keyword.display_name}
            </h1>

            <p className="prose-kr hero-desc" data-module="M01">
              {guide?.summary ?? kc?.tagline ?? keyword.description ?? ''}
            </p>
            {regionDisplayText && (
              <p className="prose-kr hero-desc" data-module="M28">
                {regionDisplayText}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              {telHref && (
                <a href={telHref} className="btn-call">
                  <PhoneIcon />
                  {phone} 상담문의
                </a>
              )}
              <Link href={`/${keyword.slug}`} className="btn-ghost-dark">
                {keyword.display_name} 전체 지역
              </Link>
            </div>

            {/* 괘선 아래 라벨 + 값 — 이 페이지에서만 달라지는 사실 두 가지 */}
            <dl className="hero-tags">
              <div>
                <dt>출장 범위</dt>
                <dd>
                  {region.profile?.dongs
                    ? `${firstDongs(region.profile.dongs, 3)} 등 전 동 출장`
                    : `${region.display_name} 전 지역 출장`}
                </dd>
              </div>
              <div>
                <dt>상담</dt>
                <dd>사진 한 장이면 가능 여부 회신</dd>
              </div>
            </dl>
          </div>

          {/* 사진 칸 — 슬라이더의 사진·버튼은 이 칸 안에 absolute 로 깔린다(폭은 landing.css가 준다) */}
          {heroImages.length > 0 && (
            <div className="hero-photo isolate">
              <HeroSlider
                images={heroImages}
                alt={`${region.display_name} ${keyword.display_name} 시공 현장`}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── 시공 사례 (전/후) ──
          히어로 다음 첫 섹션. 두 사진을 겹쳐 두고 가운데 손잡이를 좌우로 밀면 '전'이 잘리고
          '후'가 드러난다 — 나란히 놓는 것보다 같은 자리·같은 각도라는 게 드러나 비교가 된다.
          실제 사진이 등록된 키워드에서만 나온다. 스톡 두 장을 전/후로 붙이면 서로 다른 현장을
          같은 집의 시공 결과인 것처럼 보이게 되므로 사진이 없으면 섹션을 만들지 않는다.
          렌더링 박스(.panel)는 이 페이지에서 전/후·사진·상담 박스에만 쓴다. */}
      {hasModule('M20') && inheritedSets.length > 0 && (
        <section id="cases" className="lp-sec sec-rule scroll-mt-20" data-module="M20">
          <div className="wrap lp-case">
            <div className="lp-case-head">
              <SectionHead
                num={nextNo()}
                label="시공 전후"
                align="stack"
                title={
                  <>
                    {region.display_name} {keyword.display_name} 시공 전후
                  </>
                }
                desc="가운데 손잡이를 좌우로 움직이면 같은 자리의 시공 전과 후가 겹쳐 보입니다."
              />
              {casesAreIllustration && (
                <p className="lp-note mt-5" data-reveal="up">
                  <span className="tick" aria-hidden />
                  작업 내용을 나타낸 개념도입니다
                </p>
              )}
            </div>
            <div className="panel lp-case-box" data-reveal="photo">
              <BeforeAfterSlider
                sets={inheritedSets}
                alt={`${region.display_name} ${keyword.display_name} 시공 전후`}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── 자가진단 ──
          히어로에서 밀려난 체크리스트. 사진 배경 위에 두면 안 읽힌다.
          서비스 항목은 아래 서비스 섹션이 전담한다 — 여기에도 두면 같은 내용이 두 번 나온다. */}
      {hasModule('M03') && symptoms.length > 0 && (
        <section className="lp-sec sec-rule" data-module="M03">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="자가 진단"
              title={
                <>
                  이런 증상이면 {region.display_name} {josa(keyword.display_name, '이', '가')} 필요합니다
                </>
              }
            />
            <ul className="lp-grid mt-10" data-dense="" data-reveal="stagger">
              {symptoms.map((sym, i) => (
                <li key={i} className="diag-item" style={nth(i)}>
                  <span aria-hidden className="diag-box" />
                  <span>{sym}</span>
                </li>
              ))}
            </ul>
            <p className="t-serif-line mt-8" data-reveal="up">
              한 가지라도 해당된다면, 진행이 빠른 초기에 사진 상담을 권합니다.
            </p>
          </div>
        </section>
      )}

      {/* ── 지역 핵심 포인트 ──
          지역 페이지가 서로 다른 글이 되는 첫 번째 자리. 같은 키워드라도 동네마다
          실제로 들어오는 의뢰 유형이 다르다. 앞의 3개만 괘선 격자 칸으로 세우고,
          나머지는 아래 "자주 발생하는 상황" 목록이 받는다. */}
      {hasModule('M03') && local && local.top_requests.length > 0 && (
        <section className="lp-sec sec-rule" data-module="M03">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="지역 포인트"
              title={
                <>
                  {region.display_name} {keyword.display_name}의 핵심 포인트
                </>
              }
              desc="시공 전 미리 알아두면 좋은 부분을 정리했습니다."
            />
            <ul className="lp-grid mt-10" data-cols="3" data-reveal="stagger">
              {local.top_requests.slice(0, 3).map((r, i) => (
                <li key={i} style={nth(i)}>
                  <p className="lp-num" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="t-h3 mt-5">{r.title}</h3>
                  <p className="mt-3 text-[var(--ink-soft)]">{r.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── M05 상태 구분 ── */}
      {hasModule('M05') && kc?.status_criteria && (
        <section className="lp-sec sec-rule" data-module="M05">
          <div className="wrap">
            <SectionHead num={nextNo()} label="진단 기준" title={kc.status_criteria.title} />
            <ul className="lp-rows mt-10" data-reveal="stagger">
              {kc.status_criteria.list.map((item: string, i: number) => {
                const [badge, ...rest] = item.split(': ')
                return (
                  <li key={i} style={nth(i)}>
                    <span className="lp-badge">{badge}</span>
                    <p className="text-[var(--ink-soft)]">{rest.join(': ')}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ── M06 전문가 판단 — 베이지 인용 면 ── */}
      {hasModule('M06') && kc?.pro_judgment && (
        <section className="lp-sec sec-rule" data-module="M06">
          <div className="wrap">
            <SectionHead num={nextNo()} label="현장 판단" title={kc.pro_judgment.title} />
            <div className="lp-quote mt-10" data-reveal="up">
              <p className="prose-kr">{kc.pro_judgment.body}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── 지역 롱폼 본문 ──
          검색 엔진이 이 페이지를 "지역명만 바꾼 복붙"이 아니라고 판단하는 근거가 되는 본문.
          소제목마다 지역+키워드를 붙인다 — 목차만 훑어도 이 페이지가 무엇에 대한 글인지
          드러나야 하고, 그게 곧 타겟 키워드다. 원래 제목(h2)이 없는 자리라 번호 라벨만 단다. */}
      {local && (hasModule('M04') || hasModule('M09')) && (
        <section className="lp-sec sec-rule" data-module="M04 M09">
          <div className="wrap">
            <div className="sec-head" data-align="stack">
              <div className="sec-title" data-reveal="up">
                <p className="label-mono">
                  <span>{nextNo()}</span>
                  <span aria-hidden>/</span>
                  <span>지역 안내</span>
                </p>
              </div>
              <div className="sec-line" data-reveal="line" aria-hidden />
            </div>

            <div className="lp-prose">
              <p className="prose-kr lp-lead mt-10" data-reveal="up">
                {local.longform.lead}
              </p>

              {local.longform.sections.map((s, i) => (
                <div key={i} className="lp-article" data-reveal="up">
                  <h3 className="t-h3">
                    {region.display_name} {keyword.display_name} — {s.title}
                  </h3>
                  <hr className="mt-4 border-[var(--line)]" />
                  <p className="prose-kr mt-5">{s.body}</p>
                  {/* 첫 소제목 아래에만 상황 목록을 붙인다. 문단마다 반복하면 목록이 본문을 덮는다. */}
                  {i === 0 && local.top_requests.length > 3 && (
                    <ul className="lp-list mt-6">
                      {local.top_requests.slice(3).map((r, j) => (
                        <li key={j}>
                          <span aria-hidden className="tick" />
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
              <div className="lp-next mt-14" data-reveal="up">
                <div>
                  <p className="text-[var(--ink-soft)]">다른 지역도 함께 보세요</p>
                  <p className="mt-1 font-bold">
                    {keyword.display_name} 지역별 안내를 한 번에 확인하실 수 있습니다.
                  </p>
                </div>
                <Link href={`/${keyword.slug}`} className="btn-ghost">
                  {keyword.display_name} 전체 →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 서비스 안내 (키워드 자산) — 괘선 격자 ── */}
      {hasModule('M09') && kc && kc.services.length > 0 && (
        <section id="services" className="lp-sec sec-rule scroll-mt-20" data-module="M09">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="서비스"
              title={<>{keyword.display_name}, 어떤 상태든 살펴봅니다</>}
              desc="단순 외관 보수가 아니라 원인을 살펴 다음에도 같은 문제가 반복되지 않도록 마감합니다."
            />
            <ul className="lp-grid mt-10" data-cols="3" data-reveal="stagger">
              {kc.services.map((sv, i) => (
                <li key={i} style={nth(i)}>
                  <p className="lp-num" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="t-h3 mt-5">{sv.title}</h3>
                  <p className="mt-3 text-[var(--ink-soft)]">{sv.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 표준 시공 절차 — 단계 + 현장 사진(데스크톱은 오른쪽 고정) ── */}
      {(hasModule('M08') || hasModule('M09') || hasModule('M10')) && steps.length > 0 && (
        <section id="process" className="lp-sec sec-rule scroll-mt-20" data-module={hasModule('M08') ? 'M08' : hasModule('M10') ? 'M10' : 'M09'}>
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="진행 절차"
              title={
                <>
                  {region.display_name} {keyword.display_name} 진행 절차
                </>
              }
              desc={<>{region.display_name} 현장에서 실제로 진행되는 순서입니다.</>}
            />

            <div className={`lp-process mt-10 ${photoB ? 'has-photo' : ''}`}>
              {photoB && (
                <div className="hero-photo lp-process-photo" data-reveal="photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img referrerPolicy="no-referrer" src={photoB.src} alt={photoB.note ?? ''} loading="lazy" />
                  <span className="tag">{photoB.label}</span>
                </div>
              )}

              <ol className="step-rail space-y-8" data-reveal="stagger">
                {steps.map((step, i) => (
                  <li key={step.num} className="flex gap-4" style={nth(i)}>
                    <span className="step-num" aria-hidden>
                      {String(step.num).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 pt-1.5">
                      <h3 className="text-lg font-bold leading-snug">{step.title}</h3>
                      <p className="mt-1.5 text-[var(--ink-soft)]">{step.desc}</p>
                      {step.tip && (
                        <p className="step-tip mt-3 rounded-r-[var(--r-control)] px-4 py-3 text-[0.9375rem]">
                          <span className="font-bold">현장 팁</span> · {step.tip}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* ── M07 수리·교체 기준 (또는 자가수리 vs 전문가) — 괘선 기준 행 ── */}
      {hasModule('M07') && (page.diy_vs_pro || kc?.repair_vs_replace) && (
        <section className="lp-sec sec-rule" data-module="M07">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="수리·교체"
              title={kc?.repair_vs_replace ? kc.repair_vs_replace.title : '직접 할까, 맡길까'}
            />
            {kc?.repair_vs_replace ? (
              <ul className="lp-rows mt-10" data-reveal="stagger">
                {kc.repair_vs_replace.list.map((item: string, i: number) => {
                  const [badge, ...rest] = item.split(': ')
                  return (
                    <li key={i} style={nth(i)}>
                      <span className="lp-row-key">{badge}</span>
                      <span className="text-[var(--ink-soft)]">{rest.join(': ')}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="prose-kr mt-10 max-w-3xl" data-reveal="up">
                {page.diy_vs_pro}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── 재발 방지 ── */}
      {hasModule('M17') && guide && guide.prevention_tips.length > 0 && (
        <section className="lp-sec sec-rule" data-module="M17">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="관리"
              title={<>{region.display_name} 시공 후 관리·재발 방지</>}
            />
            <ul className="lp-list mt-10 max-w-3xl" data-reveal="stagger">
              {guide.prevention_tips.map((tip, i) => (
                <li key={i} style={nth(i)}>
                  <span aria-hidden className="tick" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 전문 업체가 유리한 이유 (키워드 자산) — 번호 격자 ── */}
      {hasModule('M09') && kc && kc.why_pro.length > 0 && (
        <section className="lp-sec sec-rule" data-module="M09">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="맡기는 이유"
              title={
                <>
                  {region.display_name} {keyword.display_name}, 전문 업체가 유리한 이유
                </>
              }
            />
            <ul className="lp-grid mt-10" data-dense="" data-reveal="stagger">
              {kc.why_pro.map((r, i) => (
                <li key={i} className="flex gap-4" style={nth(i)}>
                  <span className="lp-num mt-1 flex-none" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 시공 기록 발췌 ── */}
      {hasModule('M19') && casePage?.slug && (
        <section className="lp-sec sec-rule" data-module="M19">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="현장 기록"
              title={
                <>
                  {region.display_name} {keyword.display_name} 시공 기록
                </>
              }
            />
            <Link href={`/case/${casePage.slug}`} className="lp-link-row mt-10" data-reveal="up">
              <div className="min-w-0">
                <h3 className="t-h3">{casePage.meta_title}</h3>
                <p className="mt-1.5 text-[var(--ink-soft)]">
                  문제 → 판단 → 작업 → 검측 결과, 현장 순서 그대로 기록했습니다.
                </p>
              </div>
              <span aria-hidden className="lp-arrow">
                →
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {hasModule('M21') && faqs.length > 0 && (
        <section className="lp-sec sec-rule" data-module="M21">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="질문"
              title={
                <>
                  {region.display_name} {keyword.display_name} 자주 묻는 질문
                </>
              }
            />
            <div className="mt-10 max-w-3xl" data-reveal="up">
              {faqs.map((f, i) => (
                <details key={i} className="faq">
                  <summary>{f.q}</summary>
                  <div>{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 지역 마스터 ──
          담당자 안내는 본문 모듈이 아니라 서비스 정보다. CT 조합표로 껐다 켜지 않는다.
          전화 버튼이 든 상담 박스라 렌더링 박스(.panel)로 둔다. */}
      {pros.length > 0 && (
        <section className="lp-sec sec-rule" data-chrome="local-masters">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="담당"
              title={
                <>
                  {region.display_name} {keyword.display_name} 담당 마스터
                </>
              }
            />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-reveal="stagger">
              {pros.map((pro, i) => (
                <div key={pro.id} className="panel flex flex-col p-6" style={nth(i)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="t-h3">{pro.shop_name ?? `${region.display_name} 담당 마스터`}</h3>
                    </div>
                    {pro.master_grade && (
                      <span className="flex-none rounded-[var(--r-chip)] bg-[var(--teal-soft)] px-2 py-1 text-xs font-bold text-[var(--teal)]">
                        {pro.master_grade}
                      </span>
                    )}
                  </div>
                  {pro.distance && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
                      <PinIcon />
                      {pro.distance}
                    </p>
                  )}
                  {pro.badges.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {pro.badges.map((b, j) => (
                        <li
                          key={j}
                          className="rounded-[var(--r-chip)] border border-[var(--line)] px-2 py-0.5 text-xs font-medium text-[var(--ink-soft)]"
                        >
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a href={`tel:${pro.phone.replace(/-/g, '')}`} className="btn-call mt-6 w-full">
                    <PhoneIcon />
                    {pro.phone}
                  </a>
                </div>
              ))}
            </div>
            {page.area_served && (
              <p className="t-caption mt-5">출장 지역 · {page.area_served}</p>
            )}
          </div>
        </section>
      )}

      {/* ── 거미줄 내부링크 ──
          CT·MOD는 본문 모듈을 규정하지 사이트 내비게이션을 규정하지 않는다. CT1 옵션표에
          M22가 없다는 이유로 이 블록을 끄면 키워드끼리 홈을 거치지 않고는 서로 연결되지
          않는다 — 실제로 한 번 꺼졌던 자리라 다시 모듈 게이트에 묶지 않는다.
          카드 상자 대신 썸네일 행 목록(괘선) — 렌더링 박스는 전/후·사진·상담에만 쓴다. */}
      <section className="lp-sec sec-rule" data-chrome="related-links">
        <div className="wrap">
          <SectionHead num={nextNo()} label="관련 페이지" title="관련 서비스 페이지" />

          {/* (a) 같은 키워드 · 다른 지역 */}
          {sameKeyword.length > 0 && (
            <div className="mt-10">
              <h3 className="lp-sub">{keyword.display_name} · 인근 지역</h3>
              <p className="t-caption mt-1">
                실제로 다음에 보실 만한 동네부터 골랐습니다. 전체는 아래 사이트맵에 있습니다.
              </p>
              <ul className="lp-links mt-5" data-reveal="stagger">
                {sameKeyword.map((x, i) => {
                  const dong = x.chain[x.chain.length - 1]
                  const ph = keywordPhoto(keyword.slug, dong.slug)
                  return (
                    <li key={x.page.id} style={nth(i)}>
                      <Link href={`/${keyword.slug}/${x.chain.map((r) => r.slug).join('/')}`} className="lp-card">
                        {ph && (
                          <div className="lp-card-thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img referrerPolicy="no-referrer" src={ph} alt="" loading="lazy" />
                          </div>
                        )}
                        <div className="lp-card-body">
                          <p className="lp-card-title">
                            {dong.display_name} {keyword.display_name}
                          </p>
                          {dong.profile?.near && <p className="lp-card-meta truncate">{dong.profile.near}</p>}
                          <p className="lp-card-go">바로가기 →</p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* (b) 같은 지역 · 다른 키워드 — 이동해도 같은 틀에 키워드·내용만 바뀐 페이지가 나온다.
                 지금 보고 있는 페이지를 맨 앞에 표식으로 세워, 어디에서 어디로 가는지 보이게 한다. */}
          {sameRegion.length > 0 && (
            <div className="mt-12">
              <h3 className="lp-sub">{region.display_name}에서 함께 가능한 수리</h3>
              <ul className="lp-links mt-5" data-reveal="stagger">
                {/* 첫 칸은 지금 보고 있는 페이지. 링크가 아니라 현재 위치 표시다 —
                    어디에서 어디로 가는지 보여야 옆 칸을 누를 이유가 생긴다. */}
                <li style={nth(0)}>
                  <div className="lp-card is-here">
                    {photoA && (
                      <div className="lp-card-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img referrerPolicy="no-referrer" src={photoA.src} alt="" loading="lazy" />
                      </div>
                    )}
                    <div className="lp-card-body">
                      <span className="lp-here">현재 페이지</span>
                      <p className="lp-card-title">
                        {region.display_name} {keyword.display_name}
                      </p>
                      <p className="lp-card-meta line-clamp-2">{kc?.tagline ?? keyword.description ?? ''}</p>
                    </div>
                  </div>
                </li>
                {sameRegion.map(({ page: p, kw }, i) => {
                  const ph = keywordPhoto(kw!.slug, region.slug)
                  return (
                    <li key={p.id} style={nth(i + 1)}>
                      <Link href={`/${kw!.slug}/${pathStr}`} className="lp-card">
                        {ph && (
                          <div className="lp-card-thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img referrerPolicy="no-referrer" src={ph} alt="" loading="lazy" />
                          </div>
                        )}
                        <div className="lp-card-body">
                          <p className="lp-card-title">
                            {region.display_name} {kw!.display_name}
                          </p>
                          <p className="lp-card-meta line-clamp-2">
                            {kw!.content?.tagline ?? kw!.description ?? ''}
                          </p>
                          <p className="lp-card-go">바로가기 →</p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* (c) 상위로 */}
          <div className="mt-12">
            <h3 className="lp-sub">상위 페이지</h3>
            <ul className="region-cols mt-3">
              <li>
                <Link href={`/${keyword.slug}`}>
                  <span className="min-w-0 truncate">{keyword.display_name} 전체</span>
                </Link>
              </li>
              {ancestorLinks.map((a) => (
                <li key={a.region.id}>
                  <Link href={`/${keyword.slug}/${a.path}`}>
                    <span className="min-w-0 truncate">
                      {a.region.display_name} {keyword.display_name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* (d) 다른 수리 분야 */}
          {otherHubs.length > 0 && (
            <div className="mt-12">
              <h3 className="lp-sub">다른 수리 항목</h3>
              <ul className="region-cols mt-3">
                {otherHubs.map((k) => (
                  <li key={k.id}>
                    <Link href={`/${k.slug}`}>
                      <span className="min-w-0 truncate">{k.display_name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center font-bold text-[var(--copper)] hover:underline"
                >
                  전체 수리 항목 보기
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── 최하단 상담 박스 ──
          본문을 끝까지 읽은 사람이 마지막으로 만나는 화면이다. 여기서 아무 것도 제시하지
          않으면 그대로 닫는다. 베이지 면 렌더링 박스 + 세리프 제목 + 버튼 두 개(전화 · 이 수리 전체 지역).
          바로 아래 전역 상담 띠(어두운 면)와 겹치지 않게 이 자리는 밝은 면으로 둔다. */}
      {hasModule('M24') && (
        <section className="lp-sec sec-rule" data-module="M24">
          <div className="wrap">
            <div className="panel lp-consult" data-reveal="up">
              <div className="min-w-0">
                <p className="label-mono">상담</p>
                <h2 className="lp-consult-title">
                  {keyword.display_name} 상태 사진 한 장이면 충분합니다
                </h2>
                <p className="mt-4 max-w-xl text-[var(--ink-soft)]">
                  현장 상태에 맞춰 시공 가능 여부와 일정을 안내드립니다. 작업 중에는 통화가 어려우니
                  사진과 지역, 수리 내용을 남겨 주세요.
                </p>
                <ul className="lp-consult-facts">
                  <li>
                    <span className="tick" aria-hidden />
                    {region.display_name} 전 지역 출장
                  </li>
                  <li>
                    <span className="tick" aria-hidden />
                    진단부터 마감까지 한 번에
                  </li>
                  <li>
                    <span className="tick" aria-hidden />
                    사진·문자 상담 환영
                  </li>
                </ul>
              </div>
              <div className="lp-consult-btns">
                {telHref && (
                  <a href={telHref} className="btn-call">
                    <PhoneIcon />
                    {phone} 상담문의
                  </a>
                )}
                <Link href={`/${keyword.slug}`} className="btn-ghost">
                  {keyword.display_name} 전체 지역
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 사이트맵 ── */}
      {(sameRegion.length > 0 || otherHubs.length > 0) && (
        <section id="sitemap" className="lp-sec sec-rule scroll-mt-20">
          <div className="wrap">
            <SectionHead
              num={nextNo()}
              label="페이지 색인"
              title={<>{region.display_name}에서 볼 수 있는 페이지</>}
              desc="아래 페이지들이 서로 연결되어 있습니다. 필요한 정보로 바로 이동해 보세요."
            />
            <ul className="region-cols mt-10" data-reveal="up">
              {sameRegion.map(({ page: p, kw }) => (
                <li key={p.id}>
                  <Link href={`/${kw!.slug}/${pathStr}`}>
                    <span className="min-w-0 truncate">
                      {region.display_name} {kw!.display_name}
                    </span>
                  </Link>
                </li>
              ))}
              {otherHubs.slice(0, 6).map((k) => (
                <li key={`hub-${k.id}`}>
                  <Link href={`/${k.slug}`}>
                    <span className="min-w-0 truncate">{k.display_name}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* 권역별 전체 지역 색인 — 접혀 있어도 링크는 HTML에 그대로 남는다.
                화면은 권역 수(4줄)만 쓰고, 크롤러는 형제 전부를 읽는다. */}
            {byCluster.size > 0 && (
              <div className="mt-12">
                <p className="lp-sub">{keyword.display_name} 전체 지역</p>
                <div className="mt-3 border-t border-[var(--ink)]">
                  {CLUSTER_ORDER.filter((c) => byCluster.has(c)).map((cluster) => (
                    <details key={cluster} className="area-fold">
                      <summary>
                        <span>
                          {cluster}{' '}
                          <span className="label-mono">{byCluster.get(cluster)!.length}</span>
                        </span>
                      </summary>
                      <ul className="lp-fold-links">
                        {byCluster.get(cluster)!.map((e) => (
                          <li key={e.href}>
                            <Link href={e.href}>
                              {e.name} {keyword.display_name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
                <Link
                  href={`/${keyword.slug}`}
                  className="mt-5 inline-flex min-h-11 items-center font-bold text-[var(--copper)] hover:underline"
                >
                  {keyword.display_name} 대표 페이지로 →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 모바일 하단 상담은 전역 MobileConsultBar가 맡는다(옛 .callbar 제거). 여기는 데스크톱 상담·맨 위로. */}
      <FloatingActions telHref={telHref} />
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

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-none">
      <path
        d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
