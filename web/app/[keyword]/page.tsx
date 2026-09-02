import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { blueprintBg } from '@/lib/blueprint'
import { categoryPhoto } from '@/lib/photos'
import { getKeywordImages, groupSetsByKeyword } from '@/lib/keyword-images'
import { buildKeywordContent } from '@/lib/keyword-guide'
import { BeforeAfterSlider } from '@/app/_components/BeforeAfterSlider'
import type { Page, Region } from '@/lib/types'

export const dynamicParams = false

// 거미줄 링크 한 줄 스타일 — globals.css는 다른 담당 파일이라 클래스 추가 대신 여기서 묶는다.
const ROW =
  'group flex items-baseline justify-between gap-2 rounded-lg border border-transparent px-3 py-2.5 hover:border-[var(--line)] hover:bg-[var(--paper)]'

// 본문 앵커 칩 — 긴 페이지에서 핵심 블록으로 바로 뛰게 한다.
const CHIP =
  'inline-block rounded-full border border-[var(--line)] bg-[var(--paper)] px-3.5 py-1.5 text-[13px] font-bold hover:border-[var(--copper)] hover:text-[var(--copper)]'

// 지역이 아직 0개인 키워드도 허브를 만든다.
// 발행된 지역 페이지가 있는 키워드만 만들던 때에는 sitemap에는 있는데 실제로는 404인
// 주소가 생겼다(52개 중 18개). 지역이 없으면 본문에서 안내 문구를 대신 보여준다.
export async function generateStaticParams() {
  const { keywords } = await getAllData()
  return keywords.map((k) => ({ keyword: k.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ keyword: string }> }) {
  const { keyword: keywordSlug } = await params
  const { keywords, pages } = await getAllData()
  const keyword = keywords.find((k) => k.slug === keywordSlug)
  if (!keyword) return {}
  const landings = pages.filter(
    (p) => p.page_type === 'LANDING' && isPublished(p) && p.repair_keyword_id === keyword.id,
  )
  const content = buildKeywordContent(landings, keyword.description)
  return {
    title: `${keyword.display_name} — 증상·수리 과정·자주 묻는 질문 | 수리위키`,
    description: content.summary ?? keyword.description ?? undefined,
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

  // 허브 본문. guide는 지역이 아니라 수리 종류 단위로 쓰였으므로 하위 랜딩에서 물려받는다.
  const content = buildKeywordContent(landingsByKeyword.get(keyword.id) ?? [], keyword.description)

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
  // 운영자가 올린 실사가 없을 때만, "참고 이미지"로 명시해 쓴다.
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

  // 본문이 길어졌으므로 핵심 블록으로 바로 가는 칩을 단다. 실제로 그린 섹션만 넣는다.
  const jumps = [
    content.symptoms.length > 0 ? { href: '#symptoms', label: '이런 증상' } : null,
    content.steps.length > 0 ? { href: '#process', label: '수리 과정' } : null,
    content.preventionTips.length > 0 ? { href: '#prevention', label: '재발 방지' } : null,
    content.faqs.length > 0 ? { href: '#faq', label: '자주 묻는 질문' } : null,
    { href: '#regions', label: '출장 지역' },
  ].filter((x): x is { href: string; label: string } => x !== null)

  return (
    <main className={telHref ? 'pb-24 md:pb-0' : undefined}>
      {/* ── 히어로: 제목 → 시공 전/후 사진 → 증상. 사진이 본문 맨 앞에 온다 ── */}
      <section className="relative border-b border-[var(--line)] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: blueprintBg(category?.slug ?? '', keyword.slug) }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <nav aria-label="현재 위치" className="text-[13px] text-[var(--ink-soft)]">
            <Link href="/" className="hover:text-[var(--ink)]">
              수리위키
            </Link>
            {' › '}
            <span className="font-bold text-[var(--ink)]">{keyword.display_name}</span>
          </nav>
          <h1 className="font-serif-kr mt-3 text-3xl font-black leading-[1.25] sm:text-4xl">
            {keyword.display_name}
          </h1>
          {content.summary && (
            <p className="prose-kr mt-4 max-w-2xl text-[15px] text-[var(--ink-soft)]">
              {content.summary}
            </p>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            {/* 왼쪽 — 실제 시공 전/후. 실사가 없을 때만 참고 이미지로 대체한다. */}
            <div>
              {sets.length > 0 ? (
                <>
                  <BeforeAfterSlider sets={sets} alt={`${keyword.display_name} 시공 전후 사진`} />
                  <p className="mt-2.5 text-[13px] text-[var(--ink-soft)]">
                    실제 {keyword.display_name} 현장입니다. 손잡이를 좌우로 움직이면 같은 자리의
                    시공 전과 후가 겹쳐 보입니다.
                  </p>
                </>
              ) : (
                <div className="hero-photo aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stock.src} alt="" style={stock.style} loading="eager" />
                  <span className="tag">참고 이미지</span>
                </div>
              )}
            </div>

            {/* 오른쪽 — 무엇이 문제인지 먼저, 그다음 상담 버튼 */}
            <div className="space-y-5">
              {content.symptoms.length > 0 ? (
                <aside id="symptoms" className="diag-card rounded-2xl p-6" aria-labelledby="symptoms-title">
                  <p className="eyebrow">Self Check</p>
                  <h2 id="symptoms-title" className="mt-1 text-lg font-extrabold">
                    이런 증상이면 {keyword.display_name}입니다
                  </h2>
                  <ul className="mt-4 space-y-3.5">
                    {content.symptoms.map((s, i) => (
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
              ) : (
                <aside className="diag-card rounded-2xl p-6">
                  <p className="eyebrow">How it works</p>
                  <h2 className="mt-1 text-lg font-extrabold">
                    사진 한 장이면 상담이 시작됩니다
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)]">
                    손상된 자리와 그 주변이 함께 나온 사진, 지역, 언제부터 그랬는지 —
                    이 세 가지만 보내 주시면 담당 마스터가 원인과 작업 범위를 잡아
                    회신드립니다. 아래에 상담부터 마무리까지의 순서를 정리해 두었습니다.
                  </p>
                </aside>
              )}

              <div className="flex flex-wrap gap-3">
                {telHref && (
                  <a href={telHref} className="btn-call">
                    <PhoneIcon />
                    {keyword.default_phone} 상담
                  </a>
                )}
                <a href="#regions" className="btn-ghost">
                  출장 지역 보기
                </a>
              </div>
              <p className="text-[13px] text-[var(--ink-soft)]">
                <span className="font-bold text-[var(--copper)]">안내</span> 작업 중에는 전화
                연결이 어려우니, 사진과 지역·수리 내용을 문자로 남겨 주시면 확인 후 안내드립니다.
              </p>
            </div>
          </div>

          {/* 본문 바로가기 */}
          <nav aria-label="본문 바로가기" className="mt-8 flex flex-wrap gap-2">
            {jumps.map((j) => (
              <a key={j.href} href={j.href} className={CHIP}>
                {j.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* ── 수리 과정 ── */}
      {content.steps.length > 0 && (
        <section id="process" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="eyebrow">Process</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-[1.7rem]">
            {content.generic
              ? '상담부터 시공까지, 이 순서로 진행합니다'
              : `${keyword.display_name}, 이렇게 진행합니다`}
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {content.generic
              ? '어느 지역이든 같은 순서로 움직입니다. 현장에서 달라지는 부분은 방문 진단 때 설명드립니다.'
              : '현장에서 실제로 진행되는 순서입니다.'}
          </p>

          <ol className="step-rail mt-8 space-y-7">
            {content.steps.map((step) => (
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
      {content.diyVsPro && (
        <section className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl bg-[var(--ink)] p-6 text-[var(--paper)] sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#e8b34c]">
              직접 할까, 맡길까
            </p>
            <p className="prose-kr mt-3 text-[15px] leading-relaxed text-[#d7dde0]">
              {content.diyVsPro}
            </p>
          </div>
        </section>
      )}

      {/* ── 재발 방지 ── */}
      {content.preventionTips.length > 0 && (
        <section id="prevention" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="eyebrow">Prevention</p>
          <h2 className="font-serif-kr mt-2 text-2xl font-black">시공 후 재발 방지</h2>
          <ul className="mt-6 grid gap-3">
            {content.preventionTips.map((tip, i) => (
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

      {/* ── FAQ ── */}
      {content.faqs.length > 0 && (
        <section id="faq" className="border-y border-[var(--line)] bg-white">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <p className="eyebrow">FAQ</p>
            <h2 className="font-serif-kr mt-2 text-2xl font-black">
              {keyword.display_name} 자주 묻는 질문
            </h2>
            <div className="mt-6">
              {content.faqs.map((f, i) => (
                <details key={i} className="faq">
                  <summary>{f.q}</summary>
                  <div className="text-sm">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 출장 지역 ── */}
      <section id="regions" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="eyebrow">Service Area</p>
        <h2 className="font-serif-kr mt-2 text-2xl font-black">
          {keyword.display_name} 출장 지역
        </h2>
        {myLandings.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              총 {myLandings.length}개 지역에서 안내 중입니다. 동네를 고르면 그 지역의 주거 특성과
              담당 마스터까지 함께 볼 수 있습니다.
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
            <p className="text-lg font-extrabold">아직 지역별 페이지가 없습니다</p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {keyword.display_name} 지역 페이지를 준비 중입니다. 지금도 상담은 가능하니 사진과
              주소를 남겨 주시면 담당 마스터를 연결해 드립니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {telHref && (
                <a href={telHref} className="btn-call">
                  <PhoneIcon />
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
        </div>
      </section>

      {/* ── 모바일 고정 상담바 ── */}
      {telHref && (
        <div className="callbar">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{keyword.display_name}</p>
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
