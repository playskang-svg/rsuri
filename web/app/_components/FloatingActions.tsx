'use client'

// 우하단 플로팅 버튼 — 상담 + 맨 위로.
//
// 지역 페이지는 스크롤이 길다. 본문 중간에서 상담하고 싶어진 사람이 히어로까지 되돌아가야
// 하면 그대로 이탈한다. 화면 어디에 있든 한 번에 닿는 자리를 만든다.
//
// 상담 버튼은 지금 전화(tel:)로 걸리지만, 카카오 상담이 열리면 href만 바꾸면 된다.
// 링 애니메이션은 "여기 눌러도 된다"는 신호다 — 정지된 원은 장식으로 읽히고 안 눌린다.

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
    // 모바일에는 하단 고정 상담바(.callbar)가 이미 깔려 있다. 그 위로 띄워야 서로 가리지
    // 않는다 — bottom을 모바일에서만 한 칸 올린다.
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-3 md:bottom-6 md:right-6">
      {telHref && (
        <a
          href={telHref}
          aria-label="상담 문의"
          className="pulse-ring relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e8b34c] bg-[var(--ink)] text-white shadow-lg transition-transform hover:scale-105"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 5h16v11H8l-4 3V5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      )}

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="맨 위로"
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#e8b34c]/70 bg-[var(--ink)] text-white shadow-lg transition-transform hover:scale-105"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m6 14 6-6 6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
