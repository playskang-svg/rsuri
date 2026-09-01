import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllData, isPublished } from '@/lib/supabase'
import { buildRegionIndex, getAncestorChain } from '@/lib/region-tree'

export const dynamicParams = false

export async function generateStaticParams() {
  const { pages } = await getAllData()
  return pages
    .filter((p) => p.page_type === 'CASE' && isPublished(p) && p.slug)
    .map((p) => ({ slug: p.slug as string }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { pages } = await getAllData()
  const page = pages.find((p) => p.page_type === 'CASE' && p.slug === slug)
  if (!page) return {}
  return { title: page.meta_title ?? undefined, description: page.meta_description ?? undefined }
}

// 모듈 코드 → 기록 단계 라벨. CASE 페이지는 "현장 기록 원장" 형식으로 보여준다.
const STAGE_LABEL: Record<string, string> = {
  M02: '요약',
  M03: '문제 확인',
  M06: '현장 판단',
  M08: '작업 내용',
  M18: '검측 결과',
  M24: '상담 안내',
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { pages, sections, regions, keywords, categories, localPros } = await getAllData()
  const page = pages.find((p) => p.page_type === 'CASE' && p.slug === slug && isPublished(p))
  if (!page) notFound()

  const pageSections = sections
    .filter((s) => s.page_id === page.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const keyword = keywords.find((k) => k.id === page.repair_keyword_id)
  const category = categories.find((c) => c.id === keyword?.category_id)
  const { byId } = buildRegionIndex(regions)
  const chain = page.region_id ? getAncestorChain(page.region_id, byId) : []
  const dong = chain[chain.length - 1]

  const landing = pages.find(
    (p) =>
      p.page_type === 'LANDING' &&
      p.repair_keyword_id === page.repair_keyword_id &&
      p.region_id === page.region_id &&
      isPublished(p),
  )
  const landingHref =
    landing && keyword && chain.length > 0
      ? `/${keyword.slug}/${chain.map((r) => r.slug).join('/')}`
      : null

  const pros = page.region_id ? localPros.filter((p) => p.region_id === page.region_id) : []
  const mainPro = pros[0]

  // 사람 이름 미노출(운영 방침): 후기 서명("— 홍*동 고객님 …")을 본문에서 떼어낸다
  const stripNames = (t: string) => t.replace(/\s*—\s*[^\n]*님[^\n]*$/gm, '').trimEnd()

  const summary = pageSections.find((s) => s.module_code === 'M02')
  const body = pageSections.filter((s) => s.module_code !== 'M02' && s.module_code !== 'M24')

  return (
    <main className="pb-24 md:pb-0">
      <nav aria-label="현재 위치" className="mx-auto max-w-3xl px-4 pt-5 sm:px-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--ink-soft)]">
          <li>
            <Link href="/" className="hover:text-[var(--ink)]">
              수리위키
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href="/#cases" className="hover:text-[var(--ink)]">
              시공 기록
            </Link>
          </li>
          {dong && (
            <>
              <li aria-hidden>›</li>
              <li className="font-bold text-[var(--ink)]">{dong.display_name}</li>
            </>
          )}
        </ol>
      </nav>

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="eyebrow">
          Field Record{category ? ` · ${category.display_name}` : ''}
          {dong ? ` · ${dong.display_name}` : ''}
        </p>
        <h1 className="font-serif-kr mt-3 text-2xl font-black leading-[1.3] sm:text-3xl">
          {page.meta_title}
        </h1>
        {summary && (
          <p className="mt-4 rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--ink-soft)]">
            {summary.body}
          </p>
        )}

        {/* 기록 원장 — 단계 라벨 + 본문 */}
        <div className="mt-10 space-y-8">
          {body.map((section) => (
            <section key={section.id} className="grid gap-2 sm:grid-cols-[7.5rem_1fr] sm:gap-6">
              <h2 className="text-sm font-extrabold text-[var(--teal)] sm:pt-0.5 sm:text-right">
                {STAGE_LABEL[section.module_code] ?? section.heading ?? section.module_code}
              </h2>
              <div className="whitespace-pre-line border-l-2 border-[var(--line)] pl-4 text-[15px] leading-relaxed sm:border-l sm:pl-6">
                {stripNames(section.body)}
              </div>
            </section>
          ))}
        </div>

        {/* 하단 CTA */}
        <div className="mt-12 rounded-2xl bg-[var(--ink)] p-6 text-[var(--paper)] sm:p-8">
          <p className="font-serif-kr text-xl font-black">비슷한 증상이 있으신가요?</p>
          <p className="mt-2 text-sm text-[#d7dde0]">
            작업 중에는 통화가 어려우니, 사진과 지역·수리 내용을 남겨 주시면 확인 후
            안내드립니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {mainPro && (
              <a
                href={`tel:${mainPro.phone.replace(/-/g, '')}`}
                className="btn-call"
              >
                {mainPro.phone} 상담
              </a>
            )}
            {landingHref && (
              <Link
                href={landingHref}
                className="btn-ghost !border-[var(--paper)] !text-[var(--paper)] hover:!bg-white/10"
              >
                {dong?.display_name} 표준 가이드 보기
              </Link>
            )}
          </div>
        </div>
      </article>

      {mainPro && (
        <div className="callbar">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">
              {dong?.display_name} {category?.display_name}
            </p>
            <p className="truncate text-[11px] text-[#aeb9be]">사진·문자 상담 환영</p>
          </div>
          <a
            href={`tel:${mainPro.phone.replace(/-/g, '')}`}
            className="btn-call flex-none !px-4 !py-2 text-sm"
          >
            전화 상담
          </a>
        </div>
      )}
    </main>
  )
}
