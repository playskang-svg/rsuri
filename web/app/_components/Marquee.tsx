import Link from 'next/link'

// 수리 항목 이름이 흐르는 띠. 서버 컴포넌트 — CSS 애니메이션만 쓴다.
// 트랙을 두 벌 복제해 -50%까지 밀면 이음새 없이 돈다. 두 번째 벌은 보조기기에 숨긴다.
// hover/focus-within에서 멈추고, reduced-motion·JS 없음이면 한 벌만 줄바꿈으로 보인다(globals.css).

export function Marquee({ items, speed = 60 }: { items: { label: string; href: string }[]; speed?: number }) {
  if (items.length === 0) return null
  const track = (hidden: boolean) => (
    <div className="marquee-track" aria-hidden={hidden ? 'true' : undefined}>
      {items.map((it, i) => (
        <span key={`${it.href}-${i}`} className="inline-flex items-center">
          <Link href={it.href} className="tap44" tabIndex={hidden ? -1 : undefined}>
            {it.label}
          </Link>
          <span className="sep" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="marquee" aria-label="수리 항목 전체">
      <div className="marquee-inner" style={{ ['--marquee-speed' as string]: `${speed}s` }}>
        {track(false)}
        {track(true)}
      </div>
    </div>
  )
}
