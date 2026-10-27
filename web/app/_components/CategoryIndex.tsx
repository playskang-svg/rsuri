import Link from 'next/link'
import type { Category, RepairKeyword } from '@/lib/types'

// 수리 분야 색인 — <details name="cat"> 그룹이라 JS 0으로 하나만 펼쳐진다.
// 데스크톱은 :has()로 열린 패널만 오른쪽 8열에 띄우고, 미지원 브라우저는 세로로 떨어진다(globals.css).
// 분야 사진은 categoryPhotos에 직접 고른 실사가 있을 때만 — 없으면 사진 칸 없이 목록만.

export interface CategoryPanel {
  category: Category
  items: (RepairKeyword & { regionCount: number })[]
  photo: string | null
}

export function CategoryIndex({ panels, defaultOpenSlug }: { panels: CategoryPanel[]; defaultOpenSlug?: string }) {
  const openSlug = defaultOpenSlug ?? panels[0]?.category.slug
  return (
    <div className="cat-index">
      {panels.map(({ category, items, photo }) => (
        <details key={category.id} className="cat-item" name="cat" open={category.slug === openSlug}>
          <summary>
            <span className="cat-name">{category.display_name}</span>
            <span className="label-mono">항목 {items.length}개</span>
          </summary>
          <div className="cat-panel">
            <div className={`cat-panel-grid ${photo ? '' : 'no-photo'}`}>
              <div>
                <ul className="cat-list">
                  {items.map((k) => (
                    <li key={k.id}>
                      <Link href={`/${k.slug}`}>
                        <span>{k.display_name}</span>
                        <span className="label-mono">{k.regionCount > 0 ? `지역 ${k.regionCount}` : '상담'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={`/category/${category.slug}`} className="cat-more mt-3">
                  {category.display_name} 전체 보기 →
                </Link>
              </div>
              {photo && (
                <div className="panel cat-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img referrerPolicy="no-referrer" src={photo} alt={`${category.display_name} 시공 현장`} loading="lazy" />
                </div>
              )}
            </div>
          </div>
        </details>
      ))}
    </div>
  )
}
