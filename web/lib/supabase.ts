import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'
import type {
  Region,
  Category,
  RepairKeyword,
  Page,
  PageSection,
  LocalPro,
  PageImage,
} from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다 — web/.env.local을 web/.env.example 형식으로 채워주세요.',
  )
}

// ⚠️ 빌드 캐시 주의.
// supabase-js는 내부적으로 fetch를 쓰고, Next는 그 응답을 .next/cache/fetch-cache에
// 저장한다. 한 번의 빌드 안에서 343개 페이지가 이 응답을 공유하는 건 의도한 동작이지만,
// 그 디렉터리를 빌드 사이에 보존하면 DB를 고쳐도 옛 데이터로 사이트가 구워진다
// (실제로 신규 페이지가 통째로 누락된 배포가 있었다).
//
// 여기서 cache:'no-store'로 막을 수는 없다 — 라우트가 동적으로 바뀌어 output:'export'가
// 실패한다. 그래서 CI에서 fetch-cache를 캐시하지 않는 것으로 막는다.
// .github/workflows/deploy.yml의 "Cache Next.js compiler output" 참고.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Supabase/PostgREST는 .range() 없이 .select()만 쓰면 결과가 에러 없이 1000행에서
// 조용히 잘린다 — keyword-tree 스킬에서 확인된 함정. 반드시 페이지네이션한다.
async function fetchAllRows<T>(table: string): Promise<T[]> {
  const pageSize = 1000
  let rows: T[] = []
  let from = 0
  for (;;) {
    // .order()가 반드시 있어야 한다. Postgres는 ORDER BY 없는 LIMIT/OFFSET의 행 순서를
    // 보장하지 않아서, 1000행을 넘는 순간 두 range 요청 사이에 순서가 갈리면 어떤 행은
    // 두 번 오고 어떤 행은 아예 안 온다. 안 온 행은 generateStaticParams에서도 빠져
    // 그 페이지가 통째로 빌드되지 않는다 — 조용히 일부만 배포되는 사고가 된다.
    // id는 모든 테이블의 PK(bigint identity)라 동점이 없어 이 한 줄로 순서가 못박힌다.
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows = rows.concat((data ?? []) as T[])
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return rows
}

// 페이지가 수만 개가 되어도 Supabase 쿼리 횟수는 항상 이 7번으로 고정된다.
// 이후 모든 조회는 이 결과를 메모리 안에서 조립한다 (keyword-tree 3번 "데이터 페칭 전략").
// React.cache()로 같은 렌더 트리 안의 중복 호출을 제거한다.
export const getAllData = cache(async () => {
  const [regions, categories, keywords, pages, sections, localPros, pageImages] = await Promise.all([
    fetchAllRows<Region>('suri_regions'),
    fetchAllRows<Category>('suri_categories'),
    fetchAllRows<RepairKeyword>('suri_repair_keywords'),
    fetchAllRows<Page>('suri_pages'),
    fetchAllRows<PageSection>('suri_page_sections'),
    fetchAllRows<LocalPro>('suri_local_pros'),
    fetchAllRows<PageImage>('suri_page_images'),
  ])
  return { regions, categories, keywords, pages, sections, localPros, pageImages }
})

// decision이 HOLD(또는 MERGE — 별도 리다이렉트 처리 전까지)면 아직 사이트에 존재하지
// 않는다. suri_pages의 RLS 정책(decision <> 'HOLD')과 같은 규칙을 앱 쪽에서도 지킨다 —
// generateStaticParams가 걸러내는 원본 진실.
export function isPublished(page: Page) {
  return page.decision === 'CREATE' || page.decision === 'UPDATE'
}
