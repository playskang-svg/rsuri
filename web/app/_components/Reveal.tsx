'use client'

// 스크롤 등장 효과 스위치. 화면에 아무것도 그리지 않는다.
// [data-reveal] 요소가 뷰포트에 들어오면 data-reveal-in을 붙이고 관찰을 끝낸다.
// 초기 숨김은 globals.css에서 html.has-js 뒤에서만 걸리므로 JS가 없으면 전부 보인다.
// 페이지 전환(next/link) 뒤 새 요소도 잡아야 하므로 pathname이 바뀔 때마다 다시 훑는다.

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function Reveal(): null {
  const pathname = usePathname()

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-in])')
    if (targets.length === 0) return
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-reveal-in', ''))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-reveal-in', '')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    )
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [pathname])

  return null
}
