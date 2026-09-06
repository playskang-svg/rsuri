'use client'

// 헤더 시공 이름 검색.
//
// 사이트는 output:'export'라 서버가 없다 — 검색 API를 부를 수 없다. 대신 빌드 때
// 키워드 목록(151개, 이름+슬러그만)을 레이아웃이 통째로 넘겨주고 브라우저에서 거른다.
// 항목이 수천 개로 늘면 그때 색인 파일을 따로 뽑아 lazy fetch로 바꾼다.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface SearchItem {
  slug: string
  name: string
  /** 이 시공이 안내 중인 지역 수 — 많은 쪽을 위로 올린다 */
  regions: number
}

const MAX = 8

// 초성이나 띄어쓰기 차이로 놓치지 않게 공백을 지우고 비교한다.
// ("문틀 수리" 로 쳐도 "문틀수리" 가 걸려야 한다)
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export function KeywordSearch({
  items,
  className = '',
  autoFocus = false,
}: {
  items: SearchItem[]
  className?: string
  autoFocus?: boolean
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const hits = useMemo(() => {
    const query = norm(q)
    if (query.length === 0) return []
    const scored: { item: SearchItem; rank: number }[] = []
    for (const item of items) {
      const name = norm(item.name)
      const at = name.indexOf(query)
      // 슬러그(영문)로도 찾게 둔다 — 주소를 알고 들어오는 운영자용.
      const bySlug = item.slug.includes(query)
      if (at < 0 && !bySlug) continue
      // 앞에서 걸린 것 → 뒤에서 걸린 것 → 슬러그만 걸린 것 순.
      scored.push({ item, rank: at === 0 ? 0 : at > 0 ? 1 : 2 })
    }
    scored.sort(
      (a, b) => a.rank - b.rank || b.item.regions - a.item.regions ||
        a.item.name.localeCompare(b.item.name, 'ko'),
    )
    return scored.slice(0, MAX).map((s) => s.item)
  }, [q, items])

  // 목록이 바뀌면 하이라이트를 첫 줄로 되돌린다 — 엉뚱한 곳으로 엔터가 나가지 않게.
  useEffect(() => setActive(0), [q])

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  const go = (slug: string) => {
    setOpen(false)
    setQ('')
    router.push(`/${slug}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (hits.length === 0) return
    if (e.key === 'ArrowDown') {
      setActive((i) => (i + 1) % hits.length)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setActive((i) => (i - 1 + hits.length) % hits.length)
      e.preventDefault()
    } else if (e.key === 'Enter') {
      go(hits[active].slug)
      e.preventDefault()
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (hits.length > 0) go(hits[active].slug)
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>
          시공 이름 검색
        </label>
        <span aria-hidden className="search-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id={`${listId}-input`}
          type="search"
          className="search-input"
          placeholder="시공 이름 검색 (예: 방문복원)"
          autoComplete="off"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open && q.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </form>

      {open && q.trim().length > 0 && (
        <div id={listId} role="listbox" className="search-panel">
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-[var(--ink-soft)]">
              «{q.trim()}» 에 맞는 시공 이름이 없습니다.
            </p>
          ) : (
            <ul>
              {hits.map((h, i) => (
                <li key={h.slug}>
                  <Link
                    href={`/${h.slug}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      setOpen(false)
                      setQ('')
                    }}
                    className={`search-hit ${i === active ? 'is-active' : ''}`}
                  >
                    <span className="truncate font-bold">{h.name}</span>
                    <span className="flex-none text-[11px] font-semibold text-[var(--ink-soft)]">
                      {h.regions > 0 ? `${h.regions}개 지역` : '상담 가능'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
