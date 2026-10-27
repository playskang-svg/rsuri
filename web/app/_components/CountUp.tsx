'use client'

// 스탯 숫자. 서버는 최종값을 그대로 내보낸다(크롤러·JS 없음).
// 마운트 뒤 reduced-motion이 아니고 뷰에 들어오면 0 → value를 900ms easeOutCubic으로 1회 센다.

import { useEffect, useRef, useState } from 'react'

export function CountUp({ value, duration = 900, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [shown, setShown] = useState(value)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof IntersectionObserver === 'undefined') return
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - t, 3)
          setShown(Math.round(value * eased))
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        setShown(0)
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} className="stat-num">
      {shown.toLocaleString('ko-KR')}
      {suffix}
    </span>
  )
}
