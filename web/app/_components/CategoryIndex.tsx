import Link from 'next/link'
import type { Category, RepairKeyword } from '@/lib/types'
import type { FieldPhotoSet } from '@/lib/site-data'

// 수리 분야 색인 — <details name="cat"> 그룹이라 JS 0으로 하나만 펼쳐진다.
// 데스크톱은 :has()로 열린 패널만 오른쪽 8열에 띄우고, 미지원 브라우저는 세로로 떨어진다(globals.css).
//
// 오른쪽 칸은 '기록 카드'다. 예전에는 분야 사진 한 장을 세워 두었는데, 흰 벽 모서리 같은 완성 사진
// 한 장은 무엇을 고쳤는지 말해 주지 않아 밋밋했다(운영자 지적). 이제 그 분야의 실제 시공 전·후 두 장을
// 나란히 놓고 캡션과 해당 수리 페이지 링크를 붙인다. 세트는 field-photos.json categorySets에서 고른다.
//   - 실사 세트 → 전/후 나란히 (겹치지 않으므로 촬영 위치가 달라도 '같은 자리' 주장이 생기지 않는다)
//   - 개념도 세트 → 같은 모양에 '개념도' 표시
//   - 세트가 없는 분야 → 사진을 지어내지 않고 사진 상담 카드
//   - 세트는 없고 분야 사진만 있으면 → 예전처럼 한 장

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export interface CategoryPanel {
  category: Category
  items: (RepairKeyword & { regionCount: number })[]
  photo: string | null
  set?: FieldPhotoSet | null
}

function RecordCard({ set, categoryName }: { set: FieldPhotoSet; categoryName: string }) {
  const illustration = set.kind === 'illustration'
  const cells = [
    { src: set.before!, label: '시공 전' },
    { src: set.after!, label: '시공 후' },
  ]
  return (
    <figure className="panel cat-record m-0">
      <div className="cat-record-head">
        <span className="label-mono">{illustration ? '개념도' : '현장 기록'}</span>
        <span className="label-mono">{categoryName}</span>
      </div>
      <div className="cat-record-pair">
        {cells.map((c) => (
          <div key={c.label} className="cat-record-cell">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              referrerPolicy="no-referrer"
              src={c.src}
              alt={`${categoryName} ${c.label}${illustration ? ' 개념도' : ''} — ${set.caption}`}
              loading="lazy"
            />
            <span className={`chip-mono cat-record-chip ${c.label === '시공 후' ? 'is-after' : ''}`}>{c.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="cat-record-cap">
        <p className="t-serif-line">{set.caption}</p>
        {set.keywordSlug && set.keywordName && (
          <Link href={`/${set.keywordSlug}`} className="cat-record-link">
            {set.keywordName} 시공 안내 →
          </Link>
        )}
      </figcaption>
    </figure>
  )
}

function ConsultCard({ categoryName }: { categoryName: string }) {
  // 맞는 현장 사진이 아직 없는 분야. 남의 사진이나 스톡을 채우지 않고 상담 경로를 둔다.
  return (
    <div className="panel cat-consult">
      <span className="label-mono">{categoryName} 사진 상담</span>
      <p className="t-serif-line mt-3">사진 한 장이면 진단을 시작할 수 있어요.</p>
      <ol className="cat-consult-list">
        <li>
          <span className="label-mono">01</span>전체가 나오는 사진 한 장
        </li>
        <li>
          <span className="label-mono">02</span>손상 부위 근접 사진 한 장
        </li>
        <li>
          <span className="label-mono">03</span>지역·동과 증상 한 줄
        </li>
      </ol>
      <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call w-full">
        카카오톡으로 사진 상담
      </a>
    </div>
  )
}

export function CategoryIndex({ panels, defaultOpenSlug }: { panels: CategoryPanel[]; defaultOpenSlug?: string }) {
  const openSlug = defaultOpenSlug ?? panels[0]?.category.slug
  return (
    <div className="cat-index">
      {panels.map(({ category, items, photo, set }) => {
        const hasRecord = Boolean(set && set.before && set.after)
        return (
          <details key={category.id} className="cat-item" name="cat" open={category.slug === openSlug}>
            <summary>
              <span className="cat-name">{category.display_name}</span>
              <span className="label-mono">항목 {items.length}개</span>
            </summary>
            <div className="cat-panel">
              <div className="cat-panel-grid has-visual">
                <div>
                  <ul className="cat-list">
                    {items.map((k) => (
                      <li key={k.id}>
                        <Link href={`/${k.slug}`}>
                          <span>{k.display_name}</span>
                          {/* 지역 페이지가 없는 항목은 메타를 비운다 — '상담'이라 적으면 서비스 범위가 다른 것처럼 읽힌다 */}
                          {k.regionCount > 0 && <span className="label-mono">지역 {k.regionCount}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/category/${category.slug}`} className="cat-more mt-3">
                    {category.display_name} 전체 보기 →
                  </Link>
                </div>
                <div className="cat-visual">
                  {hasRecord ? (
                    <RecordCard set={set!} categoryName={category.display_name} />
                  ) : photo ? (
                    <div className="panel cat-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img referrerPolicy="no-referrer" src={photo} alt={`${category.display_name} 시공 현장`} loading="lazy" />
                      <span className="chip-mono cat-record-chip">현장 사진</span>
                    </div>
                  ) : (
                    <ConsultCard categoryName={category.display_name} />
                  )}
                </div>
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}
