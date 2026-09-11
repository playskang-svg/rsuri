import type { CSSProperties, ReactNode } from 'react'

// 참고 스킨(차곡길)의 색 블록 히어로. 왼쪽에 모노 라벨·초대형 제목·설명·태그 두 줄, 오른쪽에 사진.
// 페이지 종류마다 바탕색을 달리해 지금 어느 층(홈·허브·지역·사례)에 있는지 색으로도 알 수 있게 한다.
export type HeroTone = 'yellow' | 'blue' | 'dark' | 'beige'

export function PageHero({
  tone,
  eyebrow,
  title,
  desc,
  tags,
  photo,
  aside,
  above,
  children,
}: {
  tone: HeroTone
  eyebrow?: ReactNode
  title: ReactNode
  desc?: ReactNode
  /** 제목 아래 가는 윗줄과 함께 두는 짧은 모노 표식 두 개 */
  tags?: [string, string]
  photo?: { src: string; alt: string; style?: CSSProperties }
  /** 사진 대신 오른쪽에 둘 요소 (실사 슬라이더 등). photo 가 있으면 무시 */
  aside?: ReactNode
  /** 제목 위에 둘 요소 — 브레드크럼 등 */
  above?: ReactNode
  /** 설명 아래에 둘 버튼 등 */
  children?: ReactNode
}) {
  return (
    <section className="page-hero" data-tone={tone}>
      <div className={`hero-inner${photo || aside ? "" : " solo"}`}>
        <div className="min-w-0">
          {above}
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {desc && <div className="hero-desc">{desc}</div>}
          {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
          {tags && (
            <div className="hero-tags" aria-hidden>
              <span>{tags[0]}</span>
              <span>{tags[1]}</span>
            </div>
          )}
        </div>
        {photo ? (
          <div className="hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt={photo.alt} style={photo.style} loading="eager" />
          </div>
        ) : (
          aside && <div className="min-w-0">{aside}</div>
        )}
      </div>
    </section>
  )
}

// 섹션 머리 — 모노 라벨 + 굵은 두 줄 제목(왼쪽) + 설명(오른쪽 아래 정렬).
export function SectionHead({
  eyebrow,
  title,
  desc,
  as: Tag = 'h2',
}: {
  eyebrow: string
  title: ReactNode
  desc?: ReactNode
  as?: 'h2' | 'h3'
}) {
  return (
    <div className="sec-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <Tag>{title}</Tag>
      </div>
      {desc && <p className="sec-desc">{desc}</p>}
    </div>
  )
}
