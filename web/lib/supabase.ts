import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'
import type { Region, Category, RepairKeyword, Page, PageSection, LocalPro } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다 — web/.env.local을 web/.env.example 형식으로 채워주세요.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Supabase/PostgREST는 .range() 없이 .select()만 쓰면 결과가 에러 없이 1000행에서
// 조용히 잘린다 — keyword-tree 스킬에서 확인된 함정. 반드시 페이지네이션한다.
async function fetchAllRows<T>(table: string): Promise<T[]> {
  const pageSize = 1000
  let rows: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows = rows.concat((data ?? []) as T[])
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return rows
}

// 페이지가 수만 개가 되어도 Supabase 쿼리 횟수는 항상 이 6번으로 고정된다.
// 이후 모든 조회는 이 결과를 메모리 안에서 조립한다 (keyword-tree 3번 "데이터 페칭 전략").
// React.cache()로 같은 렌더 트리 안의 중복 호출을 제거한다.
export const getAllData = cache(async () => {
  const [regions, categories, keywords, pages, sections, localPros] = await Promise.all([
    fetchAllRows<Region>('suri_regions'),
    fetchAllRows<Category>('suri_categories'),
    fetchAllRows<RepairKeyword>('suri_repair_keywords'),
    fetchAllRows<Page>('suri_pages'),
    fetchAllRows<PageSection>('suri_page_sections'),
    fetchAllRows<LocalPro>('suri_local_pros'),
  ])
  return { regions, categories, keywords, pages, sections, localPros }
})

// decision이 HOLD(또는 MERGE — 별도 리다이렉트 처리 전까지)면 아직 사이트에 존재하지
// 않는다. suri_pages의 RLS 정책(decision <> 'HOLD')과 같은 규칙을 앱 쪽에서도 지킨다 —
// generateStaticParams가 걸러내는 원본 진실.
export function isPublished(page: Page) {
  return page.decision === 'CREATE' || page.decision === 'UPDATE'
}
