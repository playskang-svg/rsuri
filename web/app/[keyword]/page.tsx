import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'
import { categoryPhoto } from '@/lib/photos'
import { getKeywordImages, groupSetsByKeyword } from '@/lib/keyword-images'
import { BeforeAfterSlider } from '@/app/_components/BeforeAfterSlider'
import type { Page, Region } from '@/lib/types'

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
  return {
    title: `${keyword.display_name} 지역별 가이드 | 수리위키`,
    description: keyword.description ?? undefined,
  }
}

export default async function KeywordHubPage({
  params,
}: {
  params: Promise<{ keyword: string }>
}) {
  const { keyword: keywordSlug } = await params
  const { keywords, categories, pages, regions } = await getAllData()
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
  // 스톡 사진은 분위기용이라 "시공 전/후"로 부르면 안 된다(lib/photos.ts 규칙).
  // 운영자가 올린 실사가 없을 때만, "참고 이미지"로 명시해 히어로에 쓴다.
  const stock = categoryPhoto(category?.slug ?? '', keyword.slug, 0, keyword.display_name)

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

  const telHref = keyword.default_phone ? `tel:${keyword.default_phone.replace(/-/g, '')}` : undefined

  return (
    <main>
      {/* ── 히어로 ── */}
      <section className="relative border-b border-[var(--line)] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: blueprintBg(category?.slug ?? '', keyword.slug) }}
        />
        <div
          className={`relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 ${
            sets.length === 0 ? 'lg:grid-cols-[1.05fr_0.95fr] lg:items-center' : ''
          }`}
        >
          <div>
            <nav aria-label="현재 위치" className="text-[13px] text-[var(--ink-soft)]">
              <Link href="/" className="hover:text-[var(--ink)]">
                수리위키
              </Link>
              {' › '}
              <span className="font-bold text-[var(--ink)]">{keyword.display_name}</span>
            </nav>
            <h1 className="font-serif-kr mt-4 text-3xl font-black sm:text-4xl">
              {keyword.display_name}
            </h1>
            {keyword.description && (
              <p className="mt-3 max-w-2xl text-[15px] text-[var(--ink-soft)]">
                {keyword.description}
              </p>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              {telHref && (
                <a href={telHref} className="btn-call">
                  {keyword.default_phone} 상담
                </a>
              )}
              <a href="#regions" className="btn-ghost">
                {myLandings.length > 0 ? '지역 고르기' : '다른 수리 항목 보기'}
              </a>
            </div>
            <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
              <span className="font-bold text-[var(--copper)]">안내</span> 작업 중에는 전화
              연결이 어려우니, 사진과 지역·수리 내용을 문자로 남겨 주시면 확인 후 안내드립니다.
            </p>
          </div>

          {/* 실사가 없을 때만 참고 이미지를 건다 — 실제 시공 사진 옆에 스톡을 섞지 않는다. */}
          {sets.length === 0 && (
            <div className="hero-photo aspect-[16/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stock.src} alt="" style={stock.style} loading="eager" />
              <span className="tag">참고 이미지</span>
            </div>
          )}
        </div>
      </section>

      {/* ── 시공 전 · 후 (운영자가 올린 실제 사진만) ── */}
      {sets.length > 0 && (
        <section className="border-b border-[var(--line)] bg-white">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <p className="eyebrow">Before / After</p>
            <h2 className="font-serif-kr mt-2 text-2xl font-black">시공 전 · 후</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              실제 {keyword.display_name} 현장 사진입니다. 손잡이를 좌우로 움직이면 같은 자리의
              시공 전과 후가 겹쳐 보입니다.
            </p>
            <div className="mt-6">
              <BeforeAfterSlider sets={sets} alt={`${keyword.display_name} 시공 전후 사진`} />
            </div>
            <p className="mt-3 text-[13px] text-[var(--ink-soft)]">
              이 사진은 {keyword.display_name} 하위 지역 페이지에도 함께 적용됩니다.
            </p>
          </div>
        </section>
      )}

      {/* ── 키워드 자산 ──
          지역 페이지가 상속하는 것과 같은 내용이다. 허브에도 두는 이유: 지역을 아직 안 고른
          방문자가 "이 수리가 뭘 하는 건지"를 여기서 끝내고 지역을 고를 수 있어야 한다.
          이게 없으면 허브는 지역 목록만 있는 링크 페이지가 된다. */}
      {kc && kc.services.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <p className="eyebrow">Services</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">{keyword.display_name} 세부 항목</h2>
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
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <p className="eyebrow">Process</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">진행 절차</h2>
          <ol className="step-rail mt-7 space-y-7">
            {kc.process.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="step-num" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="pt-1">
                  <h3 className="font-extrabold">{step.title}</h3>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── 지역별 가이드 ── */}
      <section id="regions" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Regions</p>
        <h2 className="font-serif-kr mt-2 text-xl font-black">지역별 가이드</h2>
        {myLandings.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              동네를 고르면 그 지역의 {keyword.display_name} 안내로 이동합니다.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myLandings.map(({ page, chain }) => {
                const path = chain.map((r) => r.slug).join('/')
                const dong = chain[chain.length - 1]
                const upper = chain
                  .slice(0, -1)
                  .map((r) => r.display_name)
                  .join(' ')
                return (
                  <li key={page.id}>
                    <Link
                      href={`/${keyword.slug}/${path}`}
                      className="card group flex items-center justify-between gap-3 p-5 transition-shadow hover:shadow-lg"
                    >
                      <div>
                        <p className="text-xs text-[var(--ink-soft)]">{upper}</p>
                        <p className="mt-0.5 text-lg font-extrabold">{dong.display_name}</p>
                      </div>
                      <span
                        aria-hidden
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--line)] text-[var(--copper)] group-hover:border-[var(--copper)]"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <p className="mt-6 text-sm text-[var(--ink-soft)]">
              다른 지역은 시공 기록이 검수되는 대로 추가됩니다.
            </p>
          </>
        ) : (
          <div className="card mt-6 p-6 sm:p-8">
            <p className="text-lg font-extrabold">아직 등록된 지역이 없습니다</p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {keyword.display_name} 안내 지역을 준비 중입니다. 지금도 상담은 가능하니 사진과
              주소를 남겨 주시면 담당 마스터를 연결해 드립니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {telHref && (
                <a href={telHref} className="btn-call">
                  {keyword.default_phone} 상담
                </a>
              )}
              <a href="#more" className="btn-ghost">
                다른 수리 항목 보기
              </a>
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
        </div>
      </section>
    </main>
  )
}
