import Link from 'next/link'

// 지역 색인 — 다단 44px 행. 칩 벽 대신 읽히는 목록으로.
// 상위 limit개만 보이고, 잘라낸 개수는 밝힌다(링크 덤프 방지).

export function RegionColumns({
  regions,
  total,
  limit,
}: {
  regions: { dong: string; upper?: string; count: number; href: string }[]
  total: number
  limit: number
}) {
  const shown = regions.slice(0, limit)
  const hidden = total - shown.length
  return (
    <div data-reveal="up">
      <p className="label-mono mb-4">
        발행 지역 {total}곳 중 {shown.length}곳
      </p>
      <ul className="region-cols">
        {shown.map((d) => (
          <li key={d.href}>
            <Link href={d.href} title={d.upper ? `${d.upper} ${d.dong}` : d.dong}>
              <span>{d.dong}</span>
              <span className="label-mono">{d.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="t-caption mt-5">
          찾는 동네가 없다면{' '}
          <a href="#services" className="font-bold text-[var(--copper)] hover:underline">
            수리 항목
          </a>
          에서 항목을 먼저 고르시면 그 항목의 전체 지역을 볼 수 있습니다.
        </p>
      )}
    </div>
  )
}
