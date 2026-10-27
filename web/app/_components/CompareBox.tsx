'use client'

// 시공 전/후 비교 박스("렌더링 박스").
// 두 사진을 겹쳐 두고 구분선을 좌우로 옮기면 앞의 '전' 사진이 잘려 '후'가 드러난다 — 같은 자리·
// 같은 각도로 찍은 세트에서만 비교가 성립한다. 촬영 위치가 다른 세트(sameAngle=false)는 와이프하면
// 다른 곳 사진을 붙인 것처럼 보이므로 2단 나란히(data-layout="pair")로 보여 준다.
//
// 서버가 두 img와 style="--pos:50%"를 그대로 내보내므로 JS 없이도 반반 비교가 보인다.
// 렌더 중에는 window를 읽지 않는다(hydration 불일치 금지). 썸네일은 마운트 전까지 disabled.
//
// 터치: 사진 아무 데나 닿는 순간 구분선이 튀면 세로 스크롤 중 엄지 위치로 전/후가 바뀐다 —
// 가로로 8px 이상 끌었을 때만 드래그를 시작한다(마우스는 클릭 위치로 바로 이동).

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhotoSet } from '@/lib/keyword-images'
import type { FieldPhotoSet } from '@/lib/site-data'

/** 허브의 PhotoSet(setNo 기반)과 홈의 FieldPhotoSet(key 기반)을 모두 받는다. */
export type CompareSet = PhotoSet | FieldPhotoSet

interface NormalSet {
  key: string
  before: string | null
  after: string | null
  single: string | null
  caption: string | null
  href: string | null
  hrefLabel: string | null
  illustration: boolean
  /** false = 촬영 위치가 달라 와이프 대신 나란히 */
  sameAngle: boolean
}

function normalize(set: CompareSet, i: number): NormalSet {
  const before = set.before ?? null
  const after = set.after ?? null
  const process = 'process' in set ? set.process : []
  const urls = [before, after, ...process].filter((u): u is string => Boolean(u))
  const field = 'keywordSlug' in set ? set : null
  return {
    key: field ? field.key : `set-${(set as PhotoSet).setNo ?? i}`,
    before,
    after,
    single: before ?? after ?? process[0] ?? null,
    caption: set.caption ?? null,
    href: field?.keywordSlug ? `/${field.keywordSlug}` : null,
    hrefLabel: field?.keywordName ?? null,
    // 개념도(svg)는 실제 현장으로 오인되지 않게 화면에 밝힌다.
    illustration: urls.length > 0 && urls.every((u) => u.startsWith('/illustrations/')),
    sameAngle: field ? field.sameAngle !== false : true,
  }
}

/** 터치에서 드래그로 인정하는 최소 가로 이동(px). 그보다 세로가 크면 스크롤로 넘긴다. */
const TOUCH_DRAG_PX = 8

const clamp = (v: number) => Math.min(100, Math.max(0, v))

export function CompareBox({
  sets,
  size = 'card',
  autoWipe = false,
  showThumbs = false,
  thumbsPosition = 'bottom',
  alt,
  ratio = '4/5',
  eager = false,
  dark = false,
  showCaption = true,
}: {
  sets: CompareSet[]
  size?: 'hero' | 'card'
  /** 마운트 300ms 뒤 구분선이 한 번 훑고 돌아온다 — 홈 히어로 1회만 */
  autoWipe?: boolean
  showThumbs?: boolean
  thumbsPosition?: 'bottom' | 'side'
  alt: string
  ratio?: '4/5' | '3/4'
  /** 첫 화면(LCP) 사진이면 eager + fetchpriority high */
  eager?: boolean
  /** 어두운 면 위에 놓일 때 캡션 색 */
  dark?: boolean
  showCaption?: boolean
}): React.ReactElement | null {
  const usable = sets.map(normalize).filter((s) => s.single !== null)
  const [index, setIndex] = useState(0)
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  // 터치가 닿았지만 아직 가로로 끌지 않은 상태 — 방향이 정해질 때까지 구분선을 건드리지 않는다
  const [pending, setPending] = useState(false)
  const [auto, setAuto] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [switched, setSwitched] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const moveTo = useCallback((clientX: number) => {
    const box = boxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    if (rect.width === 0) return
    setPos(clamp(((clientX - rect.left) / rect.width) * 100))
  }, [])

  // 드래그는 박스 밖으로 나가도 이어져야 하므로 window에 붙인다 — 반드시 정리한다.
  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => moveTo(e.clientX)
    const onUp = () => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, moveTo])

  // 터치 판정: |dx| > 8 이고 가로가 세로보다 크면 드래그 시작, 세로가 크면 스크롤에 넘긴다.
  // touch-action: pan-y라 브라우저가 스크롤을 가져가면 pointercancel이 와서 여기서 끝난다.
  useEffect(() => {
    if (!pending) return
    const onMove = (e: PointerEvent) => {
      const st = touchStart.current
      if (!st) return
      const dx = e.clientX - st.x
      const dy = e.clientY - st.y
      if (Math.abs(dx) > TOUCH_DRAG_PX && Math.abs(dx) > Math.abs(dy)) {
        setPending(false)
        setDragging(true)
        moveTo(e.clientX)
      } else if (Math.abs(dy) > TOUCH_DRAG_PX) {
        setPending(false)
      }
    }
    const onEnd = () => setPending(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [pending, moveTo])

  // 썸네일은 hydration 뒤에만 눌린다. 자동 와이프는 reduced-motion·@property 미지원이면 건너뛴다
  // (등록이 안 되면 --pos가 보간되지 않아 구분선이 툭툭 끊겨 보인다).
  useEffect(() => {
    setMounted(true)
    if (!autoWipe) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof CSS === 'undefined' || typeof CSS.registerProperty !== 'function') return
    const t = window.setTimeout(() => setAuto(true), 300)
    return () => window.clearTimeout(t)
  }, [autoWipe])

  if (usable.length === 0) return null

  const current = usable[Math.min(index, usable.length - 1)]
  const hasPair = Boolean(current.before && current.after)
  // 와이프는 같은 각도 세트에서만. 각도가 다르면 나란히.
  const wipe = hasPair && current.sameAngle
  const sideBySide = hasPair && !current.sameAngle

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1
    setAuto(false)
    if (e.key === 'ArrowLeft') setPos((p) => clamp(p - step))
    else if (e.key === 'ArrowRight') setPos((p) => clamp(p + step))
    else if (e.key === 'Home') setPos(0)
    else if (e.key === 'End') setPos(100)
    else return
    e.preventDefault()
  }

  const selectSet = (i: number) => {
    if (i === index) return
    setIndex(i)
    setPos(50)
    setAuto(false)
    setSwitched(true)
  }

  const loading = eager ? 'eager' : 'lazy'

  return (
    <figure className={`compare-wrap m-0 ${dark ? 'dark-caption' : ''}`} data-thumbs={showThumbs && usable.length > 1 ? thumbsPosition : undefined}>
      <div
        ref={boxRef}
        className="compare"
        data-size={size}
        data-ratio={ratio}
        data-pair={wipe ? '' : undefined}
        data-layout={sideBySide ? 'pair' : undefined}
        data-auto={auto && wipe ? '' : undefined}
        style={{ ['--pos' as string]: `${pos}%` }}
        onAnimationEnd={() => setAuto(false)}
        // 마우스는 누른 자리로 바로. 터치는 가로로 끌기 시작했을 때만(위 useEffect).
        onPointerDown={
          wipe
            ? (e) => {
                setAuto(false)
                if (e.pointerType === 'touch') {
                  touchStart.current = { x: e.clientX, y: e.clientY }
                  setPending(true)
                  return
                }
                setDragging(true)
                moveTo(e.clientX)
              }
            : undefined
        }
      >
        <span aria-hidden className="corner" />
        <div className="compare-pair" key={current.key} data-switched={switched ? '' : undefined}>
          {sideBySide ? (
            <>
              {/* 촬영 위치가 다른 세트 — 전·후를 나란히. 자르지 않은 3:4 두 장 */}
              <figure className="pair-cell m-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img referrerPolicy="no-referrer" src={current.before!} alt={`${alt} 시공 전`} draggable={false} loading={loading} fetchPriority={eager ? 'high' : undefined} />
                <span className="chip-mono chip-before">시공 전</span>
              </figure>
              <figure className="pair-cell m-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img referrerPolicy="no-referrer" src={current.after!} alt={`${alt} 시공 후`} draggable={false} loading={loading} fetchPriority={eager ? 'high' : undefined} />
                <span className="chip-mono chip-after">시공 후</span>
              </figure>
            </>
          ) : hasPair ? (
            <>
              {/* 뒤: 시공 후 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                referrerPolicy="no-referrer"
                src={current.after!}
                alt={`${alt} 시공 후`}
                draggable={false}
                loading={loading}
                fetchPriority={eager ? 'high' : undefined}
                className="compare-after"
              />
              {/* 앞: 시공 전 — 구분선 위치만큼만 남기고 잘라낸다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                referrerPolicy="no-referrer"
                src={current.before!}
                alt={`${alt} 시공 전`}
                draggable={false}
                loading={loading}
                fetchPriority={eager ? 'high' : undefined}
                className="compare-before"
              />
              <span className="chip-mono chip-before">시공 전</span>
              <span className="chip-mono chip-after">시공 후</span>
              <div aria-hidden className="compare-line" />
              <button
                type="button"
                role="slider"
                aria-label={`${alt} 시공 전후 비교 위치`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pos)}
                aria-valuetext={`시공 전 ${Math.round(pos)}% 노출`}
                onKeyDown={onKeyDown}
                className="compare-handle"
              >
                <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden>
                  <path d="M7 1 1 7l6 6M15 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img referrerPolicy="no-referrer" src={current.single!} alt={alt} draggable={false} loading={loading} />
              <span className="chip-mono chip-before">
                {current.before ? '시공 전' : current.after ? '시공 후' : '시공 과정'}
              </span>
            </>
          )}
        </div>
        {current.illustration && <span className="chip-mono chip-illust">개념도</span>}
        {usable.length > 1 && (
          <span className="chip-mono chip-count" aria-hidden>
            {index + 1} / {usable.length}
          </span>
        )}
      </div>

      {showThumbs && usable.length > 1 && (
        <div className="compare-thumbs" role="tablist" aria-label="사진 세트 선택">
          {usable.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              className="compare-thumb tap44"
              onClick={() => selectSet(i)}
              aria-label={`사진 세트 ${i + 1}${s.caption ? `: ${s.caption}` : ''}`}
              aria-current={i === index ? 'true' : undefined}
              aria-selected={i === index}
              disabled={!mounted}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img referrerPolicy="no-referrer" src={s.after ?? s.single!} alt="" loading="lazy" draggable={false} />
            </button>
          ))}
        </div>
      )}

      {showCaption && (current.caption || current.href) && (
        <figcaption className={`compare-caption ${dark ? 'dark' : ''}`}>
          {current.caption && <p className="cap">{current.caption}</p>}
          {current.href && (
            <p className="meta">
              <Link href={current.href}>
                {current.hrefLabel} →
              </Link>
            </p>
          )}
        </figcaption>
      )}
    </figure>
  )
}
