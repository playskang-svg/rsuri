'use client'

import { useEffect, useState } from 'react'

export interface HeroImage {
  src: string
  style?: React.CSSProperties
  alt?: string
}

const INTERVAL_MS = 5000

export function HeroSlider({ images, alt, isFullBleed }: { images: HeroImage[]; alt: string; isFullBleed?: boolean }) {
  const [i, setI] = useState(0)
  const n = images.length

  useEffect(() => {
    if (n <= 1) return
    const t = setInterval(() => setI((v) => (v + 1) % n), INTERVAL_MS)
    return () => clearInterval(t)
  }, [n])

  if (n === 0) return null

  const go = (next: number) => setI(((next % n) + n) % n)

  if (isFullBleed) {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        {/* Black base so fades don't show page background */}
        <div className="absolute inset-0 bg-black" />

        {/* Stacked images */}
        {images.map((img, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img referrerPolicy="no-referrer"
            key={idx}
            src={img.src}
            alt={img.alt || (idx === 0 ? alt : '')}
            style={{
              ...img.style,
              opacity: idx === i ? 1 : 0,
              transform: idx === i ? 'scale(1.02)' : 'scale(1.08)',
              transition: 'opacity 1.2s ease-in-out, transform 6s ease-out',
            }}
            loading={idx === 0 ? 'eager' : 'lazy'}
            aria-hidden={idx !== i}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ))}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/15" />
      </div>
    )
  }

  // Non-fullbleed (original inline slider for landing pages)
  return (
    <>
      {images.map((img, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img referrerPolicy="no-referrer"
          key={idx}
          src={img.src}
          alt={img.alt || (idx === 0 ? alt : '')}
          style={img.style}
          loading={idx === 0 ? 'eager' : 'lazy'}
          aria-hidden={idx !== i}
          className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ${
            idx === i ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(i - 1)}
            aria-label="이전 사진"
            className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30 md:flex"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(i + 1)}
            aria-label="다음 사진"
            className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30 md:flex"
          >
            ›
          </button>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-6 md:gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => go(idx)}
                aria-label={`${idx + 1}번째 사진`}
                aria-current={idx === i}
                className={`tap44 h-2 rounded-full transition-all ${
                  idx === i ? 'w-7 bg-[var(--gold)]' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
