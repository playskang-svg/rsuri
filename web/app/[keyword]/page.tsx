import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { keywordPhotos, sameAngleByBefore } from '@/lib/photos'
import { josa } from '@/lib/josa'
import { PageHero, SectionHead } from '@/app/_components/PageHero'
import { getKeywordImages, groupSetsByKeyword, isIllustrationOnly } from '@/lib/keyword-images'
import { CompareBox } from '@/app/_components/CompareBox'
import { ProcessRail } from '@/app/_components/ProcessRail'
import { RegionColumns } from '@/app/_components/RegionColumns'
import { fallbackPhone, telHrefOf } from '@/lib/contact'
import type { Page, Region } from '@/lib/types'
// 허브 전용 스타일 — 공용 globals.css는 다른 담당 파일이라 여기서만 덧댄다(main.hub 아래로 한정).
import '../_styles/hub.css'

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

const pad2 = (n: number) => String(n).padStart(2, '0')

export const dynamicParams = false

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
  const sets = groupSetsByKeyword(await getKeywordImages(), sameAngleByBefore()).get(keyword.id) ?? []
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

  // 지역 색인(RegionColumns) 한 줄 = 이 키워드의 지역 페이지 하나.
  // 줄 이름을 "송파구 문틀수리"처럼 두어 링크 글자만 봐도 목적지가 드러나게 한다(옛 카드 제목과 같은 원칙).
  // 오른쪽 숫자는 그 동네에서 안내 중인 수리 항목 수 — 계산값이며, 화면 설명에 뜻을 밝힌다.
  const regionRows = myLandings.map(({ page, chain }) => {
    const path = chain.map((r) => r.slug).join('/')
    const dong = chain[chain.length - 1]
    const upper = chain
      .slice(0, -1)
      .map((r) => r.display_name)
      .join(' ')
    return {
      dong: `${dong.display_name} ${keyword.display_name}`,
      upper: upper || undefined,
      count: (landingsByRegion.get(page.region_id!) ?? []).length,
      href: `/${keyword.slug}/${path}`,
    }
  })

  // 섹션 번호 — 있는 섹션만 01부터 차례로 매긴다(사진·콘텐츠가 없는 항목은 칸이 빠진다).
  const sectionOrder = [
    sets.length > 0 && 'cases',
    kc && kc.services.length > 0 && 'services',
    kc && kc.symptoms.length > 0 && 'check',
    kc && kc.why_pro.length > 0 && 'why',
    kc && kc.process.length > 0 && 'process',
    'regions',
    kc && kc.faqs.length > 0 && 'faq',
    'more',
  ].filter((s): s is string => typeof s === 'string')
  const secNum = (key: string) => pad2(sectionOrder.indexOf(key) + 1)

  return (
    <main className="hub">
      {/* ── 히어로 — 종이 면. 맞는 실사가 있으면 오른쪽 3:4 렌더링 박스, 없으면 세부 항목 기록지 ── */}
      <PageHero
        tone="paper"
        above={
          <nav aria-label="현재 위치" className="hub-crumb">
            <ol>
              <li>
                <Link href="/" className="tap44">
                  수리위키
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li>
                <span aria-current="page">{keyword.display_name}</span>
              </li>
            </ol>
          </nav>
        }
        eyebrow={category?.display_name ?? '수리 항목'}
        title={keyword.display_name}
        desc={
          <>
            {keyword.description && <p>{keyword.description}</p>}
            {/* 후킹 문구에 키워드를 그대로 넣어 검색어와 화면의 말이 어긋나지 않게 한다. */}
            <p className="hub-hook">
              {keyword.display_name}, 사진 한 장이면 오늘 처리 가능한지 바로 알려드립니다.
            </p>
            <p className="hub-note">
              작업 중에는 전화 연결이 어려우니, 사진과 지역·수리 내용을 문자로 남겨 주시면 확인 후
              안내드립니다.
            </p>
            {keyword.aliases && keyword.aliases.length > 0 && (
              <p className="t-caption hub-alias">함께 찾는 말: {keyword.aliases.join(' · ')}</p>
            )}
          </>
        }
        tags={[
          '사진 한 장이면 진단 시작',
          myLandings.length > 0 ? `안내 지역 ${myLandings.length}곳` : '수도권 전역 출장',
        ]}
        /* 실제 현장 사진만 건다. 맞는 실사가 없으면 사진 칸 대신 세부 항목 목록이 선다. */
        photo={heroPhoto ? { src: heroPhoto, alt: `${keyword.display_name} 시공 현장` } : undefined}
        aside={
          kc && kc.services.length > 0 ? (
            <div className="panel hub-aside">
              <div className="hub-aside-head">
                <p className="label-mono">
                  <span className="tick" aria-hidden />
                  고치는 항목
                </p>
                <p className="label-mono">{kc.services.length}가지</p>
              </div>
              <ul>
                {kc.services.map((s, i) => (
                  <li key={i}>
                    <span className="label-mono">{pad2(i + 1)}</span>
                    <span>{s.title}</span>
                  </li>
                ))}
              </ul>
              <p className="hub-tagline">{kc.tagline}</p>
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

      {/* ── 시공 전 · 후 (운영자가 올린 실제 사진만. 개념도는 박스에 '개념도' 칩이 자동으로 붙는다) ── */}
      {sets.length > 0 && (
        <section id="cases" className="section-y sec-rule scroll-mt-16">
          <div className="wrap">
            <SectionHead
              num={secNum('cases')}
              label="시공 전후"
              title={`${keyword.display_name} 시공 전 · 후`}
              desc={`${
                setsAreIllustration
                  ? `${keyword.display_name} 작업 내용을 나타낸 개념도입니다.`
                  : '실제 현장 사진입니다.'
              } 구분선이 있는 사진은 좌우로 움직여 시공 전과 후를 비교해 보세요.`}
            />
            <div className="hub-cases mt-10">
              <div className="panel hub-compare overflow-hidden" data-reveal="photo">
                <CompareBox
                  sets={sets}
                  size="card"
                  ratio="4/5"
                  showThumbs
                  thumbsPosition="bottom"
                  alt={`${keyword.display_name} ${setsAreIllustration ? '개념도' : '현장'}`}
                  showCaption={false}
                />
              </div>
              <div data-reveal="up">
                {/* 번호는 박스 오른쪽 아래 'n / 전체' 표시와 같은 순서다. */}
                <p className="label-mono hub-records-head">
                  <span className="tick" aria-hidden />
                  {setsAreIllustration ? '개념도' : '실사 기록'} {sets.length}세트
                </p>
                {sets.some((s) => s.caption) && (
                  <ul className="hub-records">
                    {sets.map((s, i) =>
                      s.caption ? (
                        <li key={s.setNo}>
                          <span className="label-mono">{pad2(i + 1)}</span>
                          <p>{s.caption}</p>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
                <p className="t-caption hub-cases-note">
                  이 자료는 {keyword.display_name} 하위 지역 페이지에도 함께 적용됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 키워드 자산 ──
          지역 페이지가 상속하는 것과 같은 내용이다. 허브에도 두는 이유: 지역을 아직 안 고른
          방문자가 "이 수리가 뭘 하는 건지"를 여기서 끝내고 지역을 고를 수 있어야 한다.
          이게 없으면 허브는 지역 목록만 있는 링크 페이지가 된다. */}
      {kc && kc.services.length > 0 && (
        <section id="services" className="section-y sec-rule scroll-mt-16">
          <div className="wrap">
            <SectionHead
              num={secNum('services')}
              label="세부 항목"
              title={`${keyword.display_name} 세부 항목`}
              desc={kc.tagline}
            />
            <ul className="hub-items mt-10" data-reveal="stagger">
              {kc.services.map((s, i) => (
                <li key={i} style={{ ['--i' as string]: i }}>
                  <span className="label-mono">{pad2(i + 1)}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {kc && kc.symptoms.length > 0 && (
        <section className="section-y sec-rule">
          <div className="wrap">
            <SectionHead num={secNum('check')} label="자가 점검" title="이런 증상이면 의심하세요" />
            <ul
              className="hub-checks mt-10"
              data-reveal="stagger"
              style={{ ['--stagger' as string]: '60ms' }}
            >
              {kc.symptoms.map((s, i) => (
                <li key={i} style={{ ['--i' as string]: i }}>
                  <span aria-hidden className="tick" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {kc && kc.why_pro.length > 0 && (
        <section className="section-y sec-rule">
          <div className="wrap">
            <SectionHead num={secNum('why')} label="전문 시공" title="전문 업체 시공이 유리한 이유" />
            <ul className="hub-reasons mt-10" data-reveal="stagger">
              {kc.why_pro.map((r, i) => (
                <li key={i} style={{ ['--i' as string]: i }}>
                  <span className="label-mono">
                    <span className="tick" aria-hidden />
                    {pad2(i + 1)}
                  </span>
                  <p>{r}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {kc && kc.process.length > 0 && (
        <section id="process" className="section-y sec-rule scroll-mt-16">
          <div className="wrap">
            <SectionHead
              num={secNum('process')}
              label="진행 과정"
              title={
                <>
                  {keyword.display_name},
                  <br />
                  이렇게 진행합니다.
                </>
              }
              desc="작업 시간과 범위는 현장 상태와 원인, 자재에 따라 달라질 수 있습니다."
            />
            {/* 서브페이지는 어두운 면을 쓰지 않는다 — 밝은 레일(hub.css의 .rail-light) */}
            <div className="mt-10">
              <ProcessRail steps={kc.process} dark={false} />
            </div>
          </div>
        </section>
      )}

      {/* ── 지역별 가이드 ── */}
      <section id="regions" className="section-y sec-rule scroll-mt-16">
        <div className="wrap">
          <SectionHead
            num={secNum('regions')}
            label="서비스 지역"
            title={`${keyword.display_name} 서비스 지역`}
            desc={
              myLandings.length > 0
                ? `동네를 고르면 그 지역의 ${keyword.display_name} 안내로 이동합니다. 오른쪽 숫자는 그 동네에서 안내 중인 수리 항목 수입니다.`
                : undefined
            }
          />
          {myLandings.length > 0 ? (
            <>
              <div className="mt-10">
                <RegionColumns regions={regionRows} total={regionRows.length} limit={regionRows.length} />
              </div>
              <p className="hub-region-note">목록에 없는 동네도 인근이면 같은 일정으로 출장합니다.</p>
            </>
          ) : (
            <div className="panel hub-nolocal mt-10" data-reveal="up">
              <div>
                <p className="label-mono">출장 범위</p>
                <h3>{josa(keyword.display_name, '은', '는')} 수도권 전역 출장합니다</h3>
                <p className="hub-body">
                  지역을 따로 나누지 않고 서울·경기·인천 어디든 방문합니다. 사진과 주소를 남겨 주시면
                  일정을 확인해 회신드립니다. 동네별 안내는 같은 분야 항목에서 볼 수 있습니다.
                </p>
                {telHref && (
                  <div className="mt-6">
                    <a href={telHref} className="btn-call">
                      <PhoneIcon />
                      {phone} 상담
                    </a>
                  </div>
                )}
              </div>
              {siblingHubs.length > 0 && (
                <div>
                  <p className="label-mono">{category?.display_name ?? '같은 분야'} 항목</p>
                  <ul className="hub-links mt-3" data-cols="2">
                    {siblingHubs.map((k) => {
                      const n = landingsByKeyword.get(k.id)?.length ?? 0
                      return (
                        <li key={k.id}>
                          <Link href={`/${k.slug}#regions`}>
                            <span>{k.display_name}</span>
                            <span className="meta">
                              {n > 0 && <span className="label-mono">{n}개 지역</span>}
                              <span aria-hidden>→</span>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ (키워드 공통) ── */}
      {kc && kc.faqs.length > 0 && (
        <section className="section-y sec-rule">
          <div className="wrap">
            <SectionHead
              num={secNum('faq')}
              label="자주 묻는 질문"
              title={`${keyword.display_name} 자주 묻는 질문`}
            />
            <div className="hub-faq mt-10" data-reveal="up">
              {kc.faqs.map((f, i) => (
                <details key={i} className="faq">
                  <summary>{f.q}</summary>
                  <div>{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 거미줄 내부링크 ── */}
      <section id="more" className="section-y sec-rule scroll-mt-16">
        <div className="wrap">
          <SectionHead num={secNum('more')} label="관련 페이지" title="이어서 볼 페이지" />

          {repRegion && repOthers.length > 0 && (
            <div className="mt-10" data-reveal="up">
              <h3 className="hub-sub">{repRegion.display_name}에서 함께 가능한 수리</h3>
              <ul className="hub-links mt-4">
                {repOthers.map(({ page, kw }) => (
                  <li key={page.id}>
                    <Link href={`/${kw!.slug}/${repPath}`}>
                      <span>
                        <b>{kw!.display_name}</b>{' '}
                        <span className="soft">{repRegion!.display_name}</span>
                      </span>
                      <span aria-hidden className="meta">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10" data-reveal="up">
            <h3 className="hub-sub">다른 수리 항목</h3>
            <ul className="hub-links mt-4">
              {otherHubs.map((k) => {
                const n = landingsByKeyword.get(k.id)?.length ?? 0
                return (
                  <li key={k.id}>
                    <Link href={`/${k.slug}`}>
                      <span>{k.display_name}</span>
                      <span className="meta">
                        {n > 0 && <span className="label-mono">지역 {n}곳</span>}
                        <span aria-hidden>→</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <p className="mt-6">
              <Link href="/" className="hub-more">
                전체 수리 항목 보기 →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
