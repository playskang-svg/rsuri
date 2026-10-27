import type { CSSProperties, ReactNode } from 'react'
import type { HeroImage } from './HeroSlider'

// 서브페이지 히어로. tone: 'paper' | 'beige' | 'dark' | 'image'.
// 옛 값(yellow·blue)도 받는다 — 서브페이지가 아직 그 이름을 쓰므로 CSS에서 beige·dark로 매핑한다.
// photo/images가 있으면 'image' = 좌 텍스트 6열 + 우 3:4 실사 렌더링 박스(사진 위 그라데이션·자동 전환 없음).
// 사진이 없으면 오른쪽에 aside, 그것도 없으면 한 칸(solo).
export type HeroTone = 'paper' | 'beige' | 'dark' | 'image' | 'yellow' | 'blue'

export function PageHero({
  tone,
  eyebrow,
  title,
  desc,
  tags,
  photo,
  images,
  aside,
  above,
  children,
}: {
  tone: HeroTone
  eyebrow?: ReactNode
  title: ReactNode
  desc?: ReactNode
  tags?: [string, string]
  photo?: { src: string; alt: string; style?: CSSProperties }
  /** 여러 장을 넘겨도 첫 장만 건다(5초 자동 페이드는 폐기). */
  images?: HeroImage[]
  aside?: ReactNode
  above?: ReactNode
  children?: ReactNode
}) {
  const first = photo ?? (images && images.length > 0 ? { src: images[0].src, alt: images[0].alt ?? '', style: images[0].style } : null)
  const hasPhoto = Boolean(first)
  const finalTone: HeroTone = hasPhoto ? 'image' : tone
  const solo = !hasPhoto && !aside

  return (
    <section className="page-hero" data-tone={finalTone}>
      <div className={`hero-inner ${solo ? 'solo' : ''}`}>
        <div className="min-w-0" data-reveal="stagger">
          {above && <div style={{ ['--i' as string]: 0 }}>{above}</div>}
          {eyebrow && (
            <p className="label-mono" style={{ ['--i' as string]: 1 }}>
              {eyebrow}
            </p>
          )}
          <h1 style={{ ['--i' as string]: 2 }}>{title}</h1>
          {desc && (
            <div className="hero-desc" style={{ ['--i' as string]: 3 }}>
              {desc}
            </div>
          )}
          {children && (
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap" style={{ ['--i' as string]: 4 }}>
              {children}
            </div>
          )}
          {tags && (
            <dl className="hero-tags" style={{ ['--i' as string]: 5 }}>
              {tags.map((t, i) => (
                <div key={i}>
                  <dt>{i === 0 ? '기준' : '범위'}</dt>
                  <dd>{t}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {first && (
          <div className="hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img referrerPolicy="no-referrer" src={first.src} alt={first.alt} style={first.style} loading="eager" fetchPriority="high" />
          </div>
        )}
        {!first && aside && <div className="min-w-0">{aside}</div>}
      </div>
    </section>
  )
}

// 섹션 머리 — 모노 라벨(번호 + 이름) → 제목(세리프) → 설명, 아래 full-width 1px 괘선(reveal line).
// 옛 호출(eyebrow만)도 받는다: eyebrow는 label로 쓴다.
export function SectionHead({
  num,
  label,
  eyebrow,
  title,
  desc,
  as: Tag = 'h2',
  align = 'split',
  dark = false,
}: {
  num?: string
  label?: string
  /** 옛 이름 — label과 같다 */
  eyebrow?: string
  title: ReactNode
  desc?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  align?: 'split' | 'stack'
  dark?: boolean
}) {
  const text = label ?? eyebrow
  return (
    <div className="sec-head" data-align={align} data-dark={dark ? '' : undefined}>
      <div className="sec-title" data-reveal="up">
        {(num || text) && (
          <p className="label-mono">
            {num && <span>{num}</span>}
            {num && text && <span aria-hidden>/</span>}
            {text && <span>{text}</span>}
          </p>
        )}
        <Tag>{title}</Tag>
      </div>
      {desc && (
        <p className="sec-desc" data-reveal="up">
          {desc}
        </p>
      )}
      <div className="sec-line" data-reveal="line" aria-hidden />
    </div>
  )
}
