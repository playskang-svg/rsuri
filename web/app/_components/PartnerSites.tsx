import { getPartners, partnerRel, type Partner } from '@/lib/partners'

// 관리센터에서 만든 지역 전문 키워드 사이트(<주소>.suriwiki.com)를 카드로 잇는다.
// 홈은 전체, 분야 페이지는 그 분야로 매칭된 사이트만. 목록이 비면 섹션째 그리지 않는다.
export function PartnerSites({ category, title, desc }: { category?: string; title: string; desc: string }) {
  const data = getPartners()
  const list: Partner[] = category ? data.partners.filter((p) => p.hub.slug === category) : data.partners
  if (list.length === 0) return null
  const rel = partnerRel(data)
  return (
    <section id="partners" className="section-y scroll-mt-16 border-t border-[var(--line)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="eyebrow">Local Specialist Sites</p>
        <h2 className="font-serif-kr mt-2 text-2xl font-black sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">{desc}</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => (
            <li key={p.slug}>
              <a
                href={p.url}
                target="_blank"
                rel={rel}
                className="card flex h-full flex-col gap-2 p-5 transition hover:-translate-y-0.5 hover:border-[var(--copper)]"
              >
                <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--teal)]" style={{ fontFamily: 'var(--mono)' }}>
                  {p.host}
                </span>
                <span className="text-lg font-extrabold">{p.main_keyword}</span>
                {p.subs.length > 0 && (
                  <span className="text-[13px] leading-relaxed text-[var(--ink-soft)]">{p.subs.slice(0, 3).join(' · ')}</span>
                )}
                <span className="mt-auto pt-2 text-[13px] font-bold text-[var(--copper)]">
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
