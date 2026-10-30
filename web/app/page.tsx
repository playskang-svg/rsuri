import type { Metadata } from 'next'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'
import { categoryPhoto, homePhotoSets, categorySet } from '@/lib/photos'
import { loadSiteData } from '@/lib/site-data'
import { telHrefOf } from '@/lib/contact'
import { SectionHead } from '@/app/_components/PageHero'
import { PartnerSites } from '@/app/_components/PartnerSites'
import { CompareBox } from '@/app/_components/CompareBox'
import { CountUp } from '@/app/_components/CountUp'
import { Marquee } from '@/app/_components/Marquee'
import { PrincipleBand } from '@/app/_components/PrincipleBand'
import { CategoryIndex } from '@/app/_components/CategoryIndex'
import { ProcessRail } from '@/app/_components/ProcessRail'
import { RegionColumns } from '@/app/_components/RegionColumns'

// 진행 과정 다섯 칸. 사이트 전체에서 이미 약속하는 흐름(사진 접수 → 진단 → 마감)만 적는다.
const PROCESS_STEPS = [
  { title: '사진 접수', desc: '깨진 곳·상한 곳 사진과 지역, 증상을 남기면 먼저 확인합니다.' },
  { title: '원인 진단', desc: '보수로 될지 교체가 필요한지, 속까지 상했는지부터 짚습니다.' },
  { title: '범위 확인', desc: '고칠 범위와 자재, 추가될 수 있는 조건을 작업 전에 정합니다.' },
  { title: '시공', desc: '정한 범위 안에서 작업하고 바뀌는 점은 그 자리에서 알립니다.' },
  { title: '마감 점검', desc: '작업 뒤 상태를 함께 확인하고 기록을 남깁니다.' },
]

// 원칙 띠 — 키워드 콘텐츠에 이미 있는 약속만(doorframe.json why_pro·상담 문단 원문). 새 약속은 지어내지 않는다.
const PRINCIPLES = [
  { num: '01', text: '바꾸기 전에 고칠 수 있는지 먼저 봅니다' },
  { num: '02', text: '작업 전에 범위와 금액을 정하고, 작업 뒤에 추가 비용을 붙이지 않습니다' },
  // 03은 홈 공통 원칙이라 문틀 전용 원문('문틀 전체가 나오는 사진…두 장') 대신 사이트 공통 상담 문구(services desc 원문)를 쓴다 —
  // 마루·계단으로 들어온 방문자에게 문틀 사진을 요구하고, h1 lead '사진 한 장'과도 어긋났다(2026-10 비평).
  { num: '03', text: '작업 중에는 전화 연결이 어려워 사진과 지역·수리 내용을 남겨 주시면 확인 후 안내드립니다.' },
]

// 지역이 177곳까지 늘어난다. 전부 깔면 홈이 링크 덤프가 되고 본문이 밀린다 —
// 안내 항목이 많은 순으로 이만큼만 노출하고, 잘라낸 개수는 화면에 밝힌다.
const REGION_CHIP_LIMIT = 60

// 시공 전후 기록 그리드 — 0번은 히어로가 쓰므로 1번부터 최대 5장 + 마지막 칸은 상담 패널(3열에서 빈 칸이 남지 않게).
const CASE_GRID_LIMIT = 11

// 지역 이름 정규화 — '강남'과 '강남구', '수원'과 '수원시'는 같은 동네다. 홈 목록·숫자에서만 합친다(URL·slug는 그대로).
// '대구'·'중구'처럼 두 글자 이름은 접미사가 아니므로 건드리지 않는다.
const regionKey = (name: string) => (name.length > 2 ? name.replace(/(구|시|군)$/, '') : name)

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

// 피드 자동탐지 링크. 피드 리더와 검색엔진은 홈 <head>에서 이걸 찾는다.
export const metadata: Metadata = {
  alternates: {
    types: { 'application/rss+xml': [{ url: 'https://suriwiki.com/rss.xml', title: '수리위키 새 글' }] },
  },
}

// 상담 패널의 "보내 주실 것" — door-repair·doorframe.json 마지막 문단(문의 안내) 원문을 항목으로 나눴다.
const CASE_CTA_SEND = ['전체가 나오는 사진 한 장', '손상 부위 근접 사진 한 장', '지역·동과 증상 한 줄']

export default async function HomePage() {
  const { categories, keywords, pages, regions } = await getAllData()
  const { byId } = buildRegionIndex(regions)
  const phone = loadSiteData().site.phone
  const telHref = telHrefOf(phone)
  const photoSets = homePhotoSets()

  const keywordById = new Map(keywords.map((k) => [k.id, k]))

  const landings = pages
    .filter((p) => p.page_type === 'LANDING' && isPublished(p) && p.region_id && p.repair_keyword_id)
    .map((p) => {
      const chain = getAncestorChain(p.region_id!, byId)
      const kw = keywordById.get(p.repair_keyword_id!)
      return { page: p, chain, kw }
    })
    .filter((x) => x.kw && x.chain.length > 0)

  const regionCountByKeyword = new Map<number, number>()
  for (const { kw } of landings) {
    regionCountByKeyword.set(kw!.id, (regionCountByKeyword.get(kw!.id) ?? 0) + 1)
  }

  // 수리 항목 50종을 카드 50장으로 깔면 고르기 어렵다. 분야 일곱 묶음으로 세우고 묶음 안에서 고른다.
  const categoryPanels = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => {
      const items = keywords
        .filter((k) => k.category_id === category.id)
        .sort((a, b) => a.menu_order - b.menu_order)
        .map((k) => ({ ...k, regionCount: regionCountByKeyword.get(k.id) ?? 0 }))
      return { category, items, photo: categoryPhoto(category.slug), set: categorySet(category.slug) }
    })
    .filter((x) => x.items.length > 0)

  // 지역 색인: 동별로 발행 키워드 수 집계. 먼저 지역 id로 모은 뒤 같은 이름('강남'·'강남구')을 합친다 —
  // 두 줄로 나오면 중복·오류로 읽힌다. href는 페이지가 많은 쪽 slug를 유지한다(URL 불변).
  const byRegion = new Map<number, { dong: string; upper: string; count: number; href: string }>()
  for (const { chain, kw } of landings) {
    const dong = chain[chain.length - 1]
    const cur = byRegion.get(dong.id)
    if (cur) cur.count += 1
    else
      byRegion.set(dong.id, {
        dong: dong.display_name,
        upper: chain.slice(0, -1).map((r) => r.display_name).join(' '),
        count: 1,
        href: `/${kw!.slug}/${chain.map((r) => r.slug).join('/')}`,
      })
  }
  const dongStats = new Map<string, { dong: string; upper: string; count: number; href: string }>()
  for (const r of [...byRegion.values()].sort((a, b) => b.count - a.count)) {
    const key = regionKey(r.dong)
    const cur = dongStats.get(key)
    if (cur) cur.count += r.count
    else dongStats.set(key, { ...r, dong: key })
  }
  const regionChips = [...dongStats.values()].sort((a, b) => b.count - a.count || a.dong.localeCompare(b.dong, 'ko'))
  // 히어로 스탯의 '안내 지역'도 같은 기준으로 센다 — 별칭으로 부풀린 수처럼 보이지 않게.
  const regionCount = new Set(regions.map((r) => regionKey(r.display_name))).size

  // 마키 띠 — 수리 항목 50개를 전부 흘리면 검색어 나열로 읽힌다. 분야 이름과 분야마다 안내 지역이 많은 항목 둘만.
  const marqueeItems = categoryPanels.flatMap(({ category, items }) => [
    { label: category.display_name, href: `/category/${category.slug}` },
    ...[...items]
      .sort((a, b) => b.regionCount - a.regionCount)
      .slice(0, 2)
      .map((k) => ({ label: k.display_name, href: `/${k.slug}` })),
  ])

  // 숫자는 전부 데이터에서 계산된 것만 — 후기·평점·경력은 없다. 실사 세트 수는 히어로 라벨·#cases에서 밝힌다.
  const stats = [
    { value: keywords.length, label: '수리 항목' },
    { value: regionCount, label: '안내 지역' },
    { value: landings.length, label: '안내 페이지' },
  ]
  // 그리드 순서: 와이프(같은 각도) 카드 → 상담 패널 → 나란히(각도 다름) 카드. 박스 비율이 4:5와 3:2로 달라
  // 섞어 놓으면 같은 행의 카드 높이가 어긋난다.
  const caseSets = photoSets.slice(1, 1 + CASE_GRID_LIMIT)
  const wipeSets = caseSets.filter((s) => s.sameAngle !== false)
  const pairSets = caseSets.filter((s) => s.sameAngle === false)

  return (
    <main>
      {/* ── 히어로: 어두운 면 + 블루프린트 그리드, 실사 전/후 박스가 주인공 ── */}
      <section className="home-hero dark blueprint" aria-label="수리위키 소개">
        <div className="wrap">
          <div className="hero-grid">
            {/* 모바일에서는 .hero-text가 display:contents라 부모 단위 관찰이 안 된다 — 자식마다 reveal + 80ms 지연 */}
            <div className="hero-text">
              <p className="label-mono hero-label !text-[var(--gold)]" data-reveal="up" style={{ transitionDelay: '0ms' }}>
                현장 기록 · 실사 전후 {photoSets.length}세트
              </p>
              <h1 className="t-display" data-reveal="up" style={{ transitionDelay: '80ms' }}>
                바꾸기 전에
                <br />
                고칠 수 있는지
                <br />
                먼저 봅니다.
              </h1>
              <p className="t-lead" data-reveal="up" style={{ transitionDelay: '160ms' }}>
                물먹은 문틀, 깨진 문지방, 구멍 난 방문, 찍힌 마루, 닳은 계단, 찢어진 벽지까지 — 통째로 바꾸기 전에
                부분 보수·복원으로 끝낼 수 있는지부터 봅니다. 사진 한 장이면 진단을 시작할 수 있어요.
              </p>
              <div className="hero-btns" data-reveal="up" style={{ transitionDelay: '240ms' }}>
                <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call">
                  카카오톡으로 사진 상담
                </a>
                <a href={telHref} className="btn-ghost-dark">
                  {phone}
                </a>
              </div>
              <p className="hero-note" data-reveal="up" style={{ transitionDelay: '320ms' }}>
                작업 중에는 전화를 받기 어려운 시간이 많습니다 — 카카오톡 채널로 사진 한 장과 지역을 보내주세요.
              </p>
            </div>

            {/* 전/후 박스는 reveal 없이 즉시(LCP). 300ms 뒤 구분선이 한 번 훑는다. */}
            <div className="hero-box">
              {photoSets.length > 0 && (
                <CompareBox
                  sets={photoSets}
                  size="hero"
                  autoWipe
                  showThumbs
                  thumbsPosition="side"
                  alt={`${photoSets[0].keywordName ?? '현장'} 시공 전후`}
                  eager
                  dark
                />
              )}
            </div>
          </div>

          {/* 스탯 띠 — 계산값만 */}
          <ul className="stat-band">
            {stats.map((s) => (
              <li key={s.label}>
                <CountUp value={s.value} />
                <span className="stat-label">
                  <span className="tick tick-gold" aria-hidden />
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 마키 띠: 수리 항목 전체 ── */}
      <Marquee items={marqueeItems} />

      {/* ── 원칙 띠 ── */}
      <div className="py-10 lg:py-14">
        <PrincipleBand items={PRINCIPLES} />
      </div>

      {/* ── 시공 전후 기록 ── */}
      {caseSets.length > 0 && (
        <section id="cases" className="section-y sec-rule scroll-mt-16">
          <div className="wrap">
            {/* '같은 각도' 주장은 쓰지 않는다 — 촬영 위치가 다른 세트가 있고, 그 세트는 나란히 보여 준다. */}
            <SectionHead
              num="01"
              label="시공 전후"
              title="현장에서 남긴 시공 전후 기록"
              desc="같은 현장에서 찍은 시공 전과 후입니다. 촬영 위치는 조금 다를 수 있습니다. 구분선이 있는 사진은 움직여 보세요."
            />
            <ul className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3" data-reveal="stagger" style={{ ['--stagger' as string]: '90ms' }}>
              {wipeSets.map((set, i) => (
                <li key={set.key} className="panel panel-lift overflow-hidden" style={{ ['--i' as string]: i }}>
                  <CompareBox sets={[set]} size="card" alt={`${set.keywordName ?? '현장'} 시공 전후`} showCaption={false} />
                  <div className="px-5 pb-5 pt-4">
                    <p className="t-serif-line">{set.caption}</p>
                    {set.keywordSlug && (
                      <p className="label-mono mt-2">
                        <a href={`/${set.keywordSlug}`} className="inline-flex min-h-11 items-center hover:text-[var(--copper)] hover:underline">
                          {set.keywordName} →
                        </a>
                      </p>
                    )}
                  </div>
                </li>
              ))}
              {/* 상담 패널 — 5장을 3열에 깔면 빈 칸이 남는다. 문구는 히어로 lead·진행 과정 원문. */}
              <li className="panel-dark blueprint case-cta on-dark" style={{ ['--i' as string]: wipeSets.length }}>
                <div>
                  <p className="label-mono">기록 추가</p>
                  <p className="t-serif-line mt-4">사진 한 장이면 진단을 시작할 수 있어요.</p>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed">깨진 곳·상한 곳 사진과 지역, 증상을 남기면 먼저 확인합니다.</p>
                </div>
                {/* 옆 사진 카드 높이만큼 늘어나 가운데가 비던 자리. 키워드 본문(door-repair·doorframe.json)에
                    이미 있는 "보내 주실 것"과 추가 비용 약속을 그대로 옮긴다 — 새로 지어낸 약속이 아니다. */}
                <div className="case-cta-body">
                  <p className="label-mono">보내 주실 것</p>
                  <ol className="case-cta-list">
                    {CASE_CTA_SEND.map((item, i) => (
                      <li key={item}>
                        <span className="label-mono">{String(i + 1).padStart(2, '0')}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="case-cta-promise">
                    <span className="tick tick-gold" aria-hidden />
                    작업 전에 범위와 금액을 정하고, 작업 뒤에 추가 비용을 붙이지 않습니다.
                  </p>
                </div>
                <div className="case-cta-btns">
                  <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call">
                    카카오톡으로 사진 상담
                  </a>
                  <a href={telHref} className="btn-ghost-dark">
                    {phone}
                  </a>
                </div>
              </li>
              {pairSets.map((set, i) => (
                <li key={set.key} className="panel panel-lift overflow-hidden" style={{ ['--i' as string]: wipeSets.length + 1 + i }}>
                  <CompareBox sets={[set]} size="card" alt={`${set.keywordName ?? '현장'} 시공 전후`} showCaption={false} />
                  <div className="px-5 pb-5 pt-4">
                    <p className="t-serif-line">{set.caption}</p>
                    {set.keywordSlug && (
                      <p className="label-mono mt-2">
                        <a href={`/${set.keywordSlug}`} className="inline-flex min-h-11 items-center hover:text-[var(--copper)] hover:underline">
                          {set.keywordName} →
                        </a>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 수리 분야 ── */}
      <section id="services" className="section-y sec-rule scroll-mt-16">
        <div className="wrap">
          <SectionHead
            num="02"
            label="수리 분야"
            title="고칠 곳의 이름으로 바로 찾습니다."
            desc={`수리 항목 ${keywords.length}종을 분야 ${categoryPanels.length}개로 묶었습니다. 항목을 고르면 그 항목의 지역별 안내 페이지로 이동합니다. 작업 중에는 전화 연결이 어려워 사진과 지역·수리 내용을 남겨 주시면 확인 후 안내드립니다.`}
          />
          <div className="mt-10" data-reveal="up">
            <CategoryIndex panels={categoryPanels} />
          </div>
        </div>
      </section>

      {/* ── 진행 과정 — 어두운 면 ── */}
      <section id="process" className="section-y dark-2 blueprint scroll-mt-16">
        <div className="wrap">
          <SectionHead
            num="03"
            label="진행 과정"
            title="진행 단계마다 확인할 것이 있습니다."
            desc="작업 시간과 범위는 현장 상태와 원인, 자재에 따라 달라질 수 있습니다. 바뀌는 조건은 작업 전에 먼저 알립니다."
            dark
          />
          <div className="mt-10">
            <ProcessRail steps={PROCESS_STEPS} />
          </div>
        </div>
      </section>

      {/* ── 지역 색인 ── */}
      <section id="regions" className="section-y scroll-mt-16">
        <div className="wrap">
          <SectionHead
            num="04"
            label="지역"
            title="동네를 고르면 그 동네 수리로 갑니다."
            desc="동네를 고르면 그 동네에서 안내 중인 수리로 바로 이동합니다."
          />
          <div className="mt-10">
            <RegionColumns regions={regionChips} total={regionChips.length} limit={REGION_CHIP_LIMIT} />
          </div>
        </div>
      </section>

      {/* ── 지역 전문 파트너: 관리센터(admin.suriwiki.com)에서 만든 키워드 사이트 ── */}
      <PartnerSites
        num="05"
        title="공종별 지역 전문 사이트"
        desc="수리위키 관리센터에서 공종마다 따로 운영하는 지역 전문 사이트입니다. 지역별 안내와 실제 시공 사진을 그 사이트에서 확인할 수 있습니다."
      />
    </main>
  )
}
