'use client'

// 옛 이름 유지용 얇은 래퍼 — 허브·지역 랜딩이 이 이름으로 가져온다.
// 실제 구현은 CompareBox(렌더링 박스)로 옮겼다. props는 그대로(sets, alt).

import type { PhotoSet } from '@/lib/keyword-images'
import { CompareBox } from './CompareBox'

export function BeforeAfterSlider({
  sets,
  alt = '시공',
}: {
  sets: PhotoSet[]
  alt?: string
}): React.ReactElement | null {
  return <CompareBox sets={sets} alt={alt} size="card" ratio="4/5" showThumbs thumbsPosition="bottom" />
}
