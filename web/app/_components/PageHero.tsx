import type { CSSProperties, ReactNode } from 'react'
import { HeroSlider, type HeroImage } from './HeroSlider'

export type HeroTone = 'yellow' | 'blue' | 'dark' | 'beige' | 'image'

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
  images?: HeroImage[]
  aside?: ReactNode
  above?: ReactNode
  children?: ReactNode
}) {
  const hasBackground = photo || (images && images.length > 0)
  const finalImages = images ? images : (photo ? [photo] : [])

  return (
    <section
      className={`page-hero ${hasBackground ? 'has-bg' : ''}`}
      data-tone={hasBackground ? 'image' : tone}
    >
      {hasBackground && <HeroSlider images={finalImages} alt="히어로 배경 이미지" isFullBleed={true} />}
      
      <div className={`hero-inner ${hasBackground || !aside ? " solo" : ""}`} style={hasBackground ? { position: 'relative', zIndex: 2 } : undefined}>
        <div className="min-w-0">
          {above}
          {eyebrow && (
            <p className={`eyebrow ${hasBackground ? '!text-white/70 !opacity-100' : ''}`}>
              {eyebrow}
            </p>
          )}
          <h1 className={hasBackground ? '!text-white' : ''}>{title}</h1>
          {desc && (
            <div className={`hero-desc ${hasBackground ? '!text-white/90 !opacity-100' : ''}`}>
              {desc}
            </div>
          )}
          {children && <div className="mt-5 flex flex-wrap gap-3">{children}</div>}
        </div>
        {!hasBackground && aside && <div className="min-w-0">{aside}</div>}
      </div>
    </section>
  )
}

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
