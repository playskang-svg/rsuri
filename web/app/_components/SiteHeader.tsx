'use client'

// 사이트 헤더 — 종이 92% + blur, 스크롤 8px 넘으면 data-scrolled로 그림자.
// 모바일 삼선은 --paper 전면 시트(항목 56px, 전화·카카오 버튼 하단).
// 렌더 중 window를 읽지 않는다 — scrolled·open은 모두 이벤트 뒤에만 바뀐다.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { KeywordSearch, type SearchItem } from './KeywordSearch'

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export function SiteHeader({
  nav,
  phone,
  searchItems,
}: {
  nav: { href: string; label: string }[]
  phone: string
  searchItems: SearchItem[]
}) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const tel = `tel:${phone.replace(/-/g, '')}`

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 페이지가 바뀌면 시트를 닫는다. 열린 동안 본문 스크롤은 잠근다.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header className="site-head" data-scrolled={scrolled ? '' : undefined}>
        <div className="wrap head-row">
          <Link href="/" className="logo" aria-label="수리위키 홈">
            <b>수리위키</b>
            <small>집수리 안내</small>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="주요 메뉴">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="nav-link">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <KeywordSearch items={searchItems} className="hidden min-w-0 flex-1 md:block md:max-w-[15rem]" />
            <a href={tel} className="head-phone hidden md:inline-flex">
              {phone}
            </a>
            {/* .btn-call이 display를 직접 정하므로 Tailwind hidden이 밀린다 — span으로 감싸 lg 이상만 보인다 */}
            <span className="hidden lg:inline-flex">
              <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call btn-sm">
                카카오 사진 상담
              </a>
            </span>
            <button
              type="button"
              className="menu-btn lg:hidden"
              aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={open}
              aria-controls="mobile-sheet"
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden className="menu-bars">
                <i />
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div id="mobile-sheet" className="menu-sheet lg:hidden">
          <KeywordSearch items={searchItems} className="mb-3" autoFocus />
          <nav aria-label="모바일 메뉴">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}>
                <span>{n.label}</span>
                <span className="label-mono">→</span>
              </Link>
            ))}
          </nav>
          <div className="sheet-cta">
            <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call">
              카카오톡으로 사진 상담
            </a>
            <a href={tel} className="btn-ghost">
              {phone}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
