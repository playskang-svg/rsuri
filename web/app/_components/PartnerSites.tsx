import { getPartners, partnerRel, type Partner } from '@/lib/partners'
import { SectionHead } from './PageHero'

// 관리센터에서 만든 지역 전문 키워드 사이트(<주소>.suriwiki.com)를 렌더링 박스로 잇는다.
// 홈은 전체, 분야 페이지는 그 분야로 매칭된 사이트만. 목록이 비면 섹션째 그리지 않는다.
export function PartnerSites({
  category,
  title,
  desc,
  num = '05',
}: {
  category?: string
  title: string
  desc: string
  /** 페이지 안 섹션 번호 */
  num?: string
}) {
  const data = getPartners()
  const list: Partner[] = category ? data.partners.filter((p) => p.hub.slug === category) : data.partners
  if (list.length === 0) return null
  const rel = partnerRel(data)
  return (
    <section id="partners" className="section-y sec-rule scroll-mt-16">
      <div className="wrap">
        <SectionHead num={num} label="지역 전문 사이트" title={title} desc={desc} />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2" data-reveal="stagger" style={{ ['--stagger' as string]: '60ms' }}>
          {list.map((p, i) => (
            <li key={p.slug} style={{ ['--i' as string]: i }}>
              <a href={p.url} target="_blank" rel={rel} className="panel panel-lift flex h-full flex-col gap-2 p-6">
                <span className="label-mono">{p.host}</span>
                <span className="text-[1.125rem] font-bold">{p.main_keyword}</span>
                {p.subs.length > 0 && (
                  <span className="text-base leading-relaxed text-[var(--ink-soft)]">{p.subs.slice(0, 3).join(' · ')}</span>
                )}
                <span className="label-mono mt-auto pt-3 !text-[var(--copper)]">
                  {p.region_count > 0 ? `지역 ${p.region_count}곳 안내 →` : '사이트 보기 →'}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
