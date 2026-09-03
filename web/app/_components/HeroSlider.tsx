'use client'

// 히어로 배경 사진 슬라이드.
//
// 사진 한 장으로 고정하면 첫 화면이 정지 화면처럼 보이고, 그 한 장이 현장과 안 맞으면
// 페이지 전체 인상이 그 사진에 묶인다. 여러 장을 돌리면 "이런 작업을 한다"는 폭이 보인다.
//
// 자동 전환은 하되 화살표·점으로 사람이 직접 넘길 수 있어야 한다 — 자동만 있으면
// 보고 싶은 장면을 붙잡을 수 없다.

import { useEffect, useState } from 'react'

export interface HeroImage {
  src: string
  style?: React.CSSProperties
}

const INTERVAL_MS = 5000

export function HeroSlider({ images, alt }: { images: HeroImage[]; alt: string }) {
  const [i, setI] = useState(0)
  const n = images.length

  useEffect(() => {
    if (n <= 1) return
    const t = setInterval(() => setI((v) => (v + 1) % n), INTERVAL_MS)
    return () => clearInterval(t)
  }, [n])

  if (n === 0) return null

  const go = (next: number) => setI(((next % n) + n) % n)

  return (
    <>
      {images.map((img, idx) => (
        // 이미지를 갈아끼우지 않고 겹쳐 두고 투명도만 바꾼다 — src를 바꾸면 매 전환마다
        // 흰 화면이 한 번 번쩍인다(다음 장이 아직 안 받아졌기 때문).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={idx}
          src={img.src}
          alt={idx === 0 ? alt : ''}
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
          {/* 화살표는 데스크톱에서만. 모바일에서는 화면 폭을 먹고 글자 위에 겹친다. */}
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
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => go(idx)}
                aria-label={`${idx + 1}번째 사진`}
                aria-current={idx === i}
                className={`h-2 rounded-full transition-all ${
                  idx === i ? 'w-7 bg-[#e8b34c]' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
