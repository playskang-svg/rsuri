'use client'

// 시공 전/후 비교 슬라이더.
// 두 사진을 겹쳐 두고 세로 구분선을 좌우로 옮기면 앞의 '전' 사진이 잘려 '후'가 드러난다.
// 사진 두 장을 나란히 놓는 것보다 같은 각도·같은 자리라는 게 드러나 신뢰감이 생긴다.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhotoSet } from '@/lib/keyword-images'

// 세트에 전/후가 둘 다 있으면 비교 슬라이더, 하나뿐이면 그 한 장만 보여준다.
function singleImage(set: PhotoSet): string | null {
  return set.before ?? set.after ?? set.process[0] ?? null
}

function isUsable(set: PhotoSet): boolean {
  return singleImage(set) !== null
}

const clamp = (v: number) => Math.min(100, Math.max(0, v))

export function BeforeAfterSlider({
  sets,
  alt = '시공',
}: {
  sets: PhotoSet[]
  alt?: string
}): React.ReactElement | null {
  const usable = sets.filter(isUsable)
  const [index, setIndex] = useState(0)
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const moveTo = useCallback((clientX: number) => {
    const box = boxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    if (rect.width === 0) return
    setPos(clamp(((clientX - rect.left) / rect.width) * 100))
  }, [])

  // 드래그는 컨테이너 밖으로 나가도 이어져야 하므로 window에 붙인다 — 반드시 정리한다.
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

  if (usable.length === 0) return null

  const current = usable[Math.min(index, usable.length - 1)]
  const hasPair = Boolean(current.before && current.after)

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowLeft') setPos((p) => clamp(p - step))
    else if (e.key === 'ArrowRight') setPos((p) => clamp(p + step))
    else if (e.key === 'Home') setPos(0)
    else if (e.key === 'End') setPos(100)
    else return
    e.preventDefault()
  }

  const selectSet = (i: number) => {
    setIndex(i)
    setPos(50)
  }

  return (
    <figure className="m-0">
      <div
        ref={boxRef}
        className="hero-photo relative aspect-[4/3] w-full select-none"
        // 세로 스크롤은 페이지에 넘기고 가로 드래그만 우리가 받는다 (모바일).
        style={{ touchAction: 'pan-y', cursor: hasPair ? 'ew-resize' : undefined }}
        onPointerDown={
          hasPair
            ? (e) => {
                setDragging(true)
                moveTo(e.clientX)
              }
            : undefined
        }
        // 끌지 않고 그냥 지나가도 따라오게 — "마우스로 좌우 이동하며 슬라이드"
        onMouseMove={
          hasPair
            ? (e) => {
                if (!dragging) moveTo(e.clientX)
              }
            : undefined
        }
      >
        {hasPair ? (
          <>
            {/* 뒤: 시공 후 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.after!}
              alt={`${alt} 시공 후`}
              draggable={false}
              loading={index === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* 앞: 시공 전 — 구분선 위치만큼만 남기고 잘라낸다 */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.before!}
                alt={`${alt} 시공 전`}
                draggable={false}
                loading={index === 0 ? 'eager' : 'lazy'}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>

            <span
              className="tag pointer-events-none"
              style={{ left: '0.7rem', top: '0.7rem', bottom: 'auto' }}
            >
              시공 전
            </span>
            <span
              className="tag pointer-events-none"
              style={{ left: 'auto', right: '0.7rem', top: '0.7rem', bottom: 'auto' }}
            >
              시공 후
            </span>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90"
              style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
            />
            <button
              type="button"
              role="slider"
              tabIndex={0}
              aria-label={`${alt} 시공 전후 비교 위치`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pos)}
              aria-valuetext={`시공 전 ${Math.round(pos)}% 노출`}
              onKeyDown={onKeyDown}
              className="absolute top-1/2 grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--copper)] shadow-md"
              style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span aria-hidden className="text-xs font-black tracking-tighter">
                ◀▶
              </span>
            </button>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={singleImage(current)!}
              alt={alt}
              draggable={false}
              loading={index === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="tag pointer-events-none">
              {current.before ? '시공 전' : current.after ? '시공 후' : '시공 과정'}
            </span>
          </>
        )}
      </div>

      {(current.caption || usable.length > 1) && (
        <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-[var(--ink-soft)]">{current.caption}</span>
          {usable.length > 1 && (
            <span className="flex items-center gap-1.5">
              {usable.map((s, i) => (
                <button
                  key={s.setNo}
                  type="button"
                  onClick={() => selectSet(i)}
                  aria-label={`사진 세트 ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  className="h-2.5 w-2.5 rounded-full border border-[var(--line)]"
                  style={{ background: i === index ? 'var(--copper)' : 'var(--card)' }}
                />
              ))}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}
