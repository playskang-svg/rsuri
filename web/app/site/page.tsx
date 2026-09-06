import Link from 'next/link'
import {
  SITE_NETWORK,
  STATUS_LABEL,
  isInternal,
  siteCount,
  type SiteNode,
  type SiteStatus,
} from '@/lib/site-network'

export const metadata = {
  title: '사이트 모음 — 도메인별 사이트 지도 | 수리위키',
  description:
    '수리위키가 함께 운영하는 사이트를 도메인별 트리로 정리했습니다. 항목을 누르면 해당 사이트로 이동합니다.',
}

// 상태 배지 색. 운영 중은 계기 청록, 이전된 주소는 눈에 덜 띄게 회색으로 둔다.
const BADGE: Record<SiteStatus, string> = {
  live: 'bg-[var(--teal-soft)] text-[var(--teal)]',
  moved: 'bg-[var(--line)] text-[var(--ink-soft)]',
  prep: 'bg-[var(--tip-bg)] text-[var(--tip-ink)]',
}

function StatusBadge({ status }: { status: SiteStatus }) {
  return (
    <span
      className={`flex-none rounded-full px-2.5 py-0.5 text-[11px] font-bold ${BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

/** 트리의 잎 하나. 내부 경로면 같은 탭(next/link), 외부면 새 탭으로 연다. */
function SiteLeaf({ site }: { site: SiteNode }) {
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-extrabold">{site.name}</span>
        <StatusBadge status={site.status} />
      </div>
      <p className="mt-1 font-mono text-[12px] text-[var(--teal)]">{site.host}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">{site.desc}</p>
      {site.note && (
        <p className="mt-1.5 text-[12px] font-semibold text-[var(--copper)]">{site.note}</p>
      )}
    </>
  )

  const className =
    'block rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 transition-shadow hover:border-[var(--copper)] hover:shadow-md'

  return isInternal(site.href) ? (
    <Link href={site.href} className={className}>
      {inner}
    </Link>
  ) : (
    <a href={site.href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
      <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--copper)]">
        새 탭에서 열기
        <span aria-hidden>↗</span>
      </span>
    </a>
  )
}

export default function SiteMapPage() {
  return (
    <main>
      {/* ── 머리말 ── */}
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <nav aria-label="현재 위치" className="text-[13px] text-[var(--ink-soft)]">
            <Link href="/" className="hover:text-[var(--ink)]">
              수리위키
            </Link>
            {' › '}
            <span className="font-bold text-[var(--ink)]">사이트 모음</span>
          </nav>
          <h1 className="font-serif-kr mt-3 text-3xl font-black leading-[1.25] sm:text-4xl">
            사이트 모음
          </h1>
          <p className="prose-kr mt-4 max-w-2xl text-[15px] text-[var(--ink-soft)]">
            함께 운영하는 사이트를 도메인별로 묶어 트리로 정리했습니다. 도메인 아래로
            갈라지는 것이 그 도메인에 붙은 사이트이고, 어느 칸이든 누르면 해당 사이트로
            이동합니다.
          </p>
          <p className="mt-4 text-[13px] font-bold text-[var(--ink-soft)]">
            도메인 {SITE_NETWORK.length}개 · 사이트 {siteCount}개
          </p>
        </div>
      </section>

      {/* ── 도메인 트리 ── */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {SITE_NETWORK.map((group) => (
            <section key={group.host} className="card p-6 sm:p-7" aria-labelledby={group.host}>
              {/* 뿌리 노드 */}
              {isInternal(group.href) ? (
                <Link href={group.href} className="group block">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id={group.host}
                      className="font-serif-kr text-xl font-black group-hover:text-[var(--copper)]"
                    >
                      {group.label}
                    </h2>
                    <StatusBadge status={group.status} />
                  </div>
                  <p className="mt-1 font-mono text-[13px] font-bold text-[var(--teal)]">
                    {group.host}
                  </p>
                </Link>
              ) : (
                <a
                  href={group.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      id={group.host}
                      className="font-serif-kr text-xl font-black group-hover:text-[var(--copper)]"
                    >
                      {group.label}
                    </h2>
                    <StatusBadge status={group.status} />
                  </div>
                  <p className="mt-1 font-mono text-[13px] font-bold text-[var(--teal)]">
                    {group.host} <span aria-hidden>↗</span>
                  </p>
                </a>
              )}
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{group.desc}</p>

              {/* 가지 — ::before/::after로 세로줄과 꺾인 선을 그린다(이미지·JS 없이) */}
              <ul className="site-tree mt-5">
                {group.sites.map((site) => (
                  <li key={`${site.host}-${site.name}`}>
                    <SiteLeaf site={site} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-10 text-[13px] text-[var(--ink-soft)]">
          외부 사이트는 새 탭에서 열립니다. 목록이나 설명이 실제와 다르면 알려 주세요 —{' '}
          <Link href="/" className="font-bold text-[var(--teal)] hover:underline">
            수리위키 홈으로
          </Link>
        </p>
      </section>
    </main>
  )
}
