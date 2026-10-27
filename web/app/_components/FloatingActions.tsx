'use client'

// 우하단 플로팅 버튼.
// 모바일은 하단 상담바(MobileConsultBar)가 상담을 맡으므로 "맨 위로"만 띄운다.
// md 이상은 상담 + 맨 위로. 링 애니메이션은 "여기 눌러도 된다"는 신호(reduced-motion에서는 끔).

import { useEffect, useState } from 'react'

export function FloatingActions({ telHref }: { telHref?: string }) {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    // 첫 화면에서는 맨 위로 버튼이 의미가 없다 — 한 화면 넘게 내려갔을 때만 띄운다.
    const onScroll = () => setShowTop(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    // 모바일 상담바(56px + 안전영역) 위로 올린다.
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-center gap-3 md:bottom-6 md:right-6">
      {telHref && (
        <a
          href={telHref}
          aria-label="전화 상담"
          className="pulse-ring relative hidden h-14 w-14 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--ink)] text-[var(--on-ink)] shadow-lg md:flex"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 5h16v11H8l-4 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </a>
      )}

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="맨 위로"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] shadow-lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="m6 14 6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
