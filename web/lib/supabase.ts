import { cache } from 'react'
import type { Page } from './types'

// 파일 이름은 역사적 이유로 남았다(여러 페이지가 '@/lib/supabase'에서 getAllData를 가져온다).
//
// 2026-09-11부터 빌드는 DB를 읽지 않는다. 분야·키워드·지역·페이지는 저장소 파일이 원본이고
// (scripts/data/ → scripts/build-site-data.mjs → lib/site-data.json), 여기서 그 결과를 돌려준다.
// 운영자가 준 키워드 그룹으로 사이트 구조를 통째로 바꾸면서, 구조 변경이 DB 쓰기 키와
// 승인에 묶이지 않고 PR diff로 검토·배포되게 옮겼다.
//
// SURIWIKI_FIXTURES=1은 예전 화면 검증용 경로다. 이제 저장소 데이터만으로 빌드되므로
// 쓸 일이 거의 없지만, 작은 데이터로 빨리 돌려 보고 싶을 때를 위해 남겨 둔다.
export const USE_FIXTURES = process.env.SURIWIKI_FIXTURES === '1'

// React.cache()로 같은 렌더 트리 안의 중복 호출을 제거한다.
export const getAllData = cache(async () => {
  if (USE_FIXTURES) {
    const { buildFixtures } = await import('./fixtures')
    return buildFixtures()
  }
  const { buildSiteData } = await import('./site-data')
  return buildSiteData()
})

// decision이 HOLD(또는 MERGE — 별도 리다이렉트 처리 전까지)면 아직 사이트에 존재하지 않는다.
// generateStaticParams가 걸러내는 원본 진실.
export function isPublished(page: Page) {
  return page.decision === 'CREATE' || page.decision === 'UPDATE'
}
