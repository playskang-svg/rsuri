// docs/PRD.md 4번 "데이터 모델" / supabase/schema.sql 과 1:1로 맞춘 타입.
// 스키마를 바꾸면 이 파일도 같이 바꾼다.

export type RegionLevel = 'SIDO' | 'SIGUNGU' | 'DONG' | 'CUSTOM'

/**
 * 지역별 주거 특성 (suri_regions.profile jsonb).
 *
 * 지역 페이지 본문이 서로 다른 글이 되는 근거. 지어낸 값이 아니라 공개된 주거 구성
 * 사실만 넣는다 — 여기가 부정확하면 그 지역의 모든 키워드 페이지가 함께 틀린다.
 */
export interface RegionProfile {
  /** 주거 형태 분류. 키워드 문장 풀에서 어떤 변주를 고를지 결정한다. */
  type: string
  /** 히어로 한 줄에 쓰는 인접 지역 표기. 맨 앞은 자기 자신. 예) "노원구·도봉구·중랑구" */
  near: string
  /** 롱폼 리드 문단에 들어가는 주거 특성 한 줄 (마침표 없이 끝낸다) */
  note: string
  /** 출장 범위 FAQ 답변에 나열할 실제 행정동 */
  dongs: string
}

export interface Region {
  id: number
  parent_id: number | null
  level: RegionLevel
  slug: string
  display_name: string
  lat: number | null
  lng: number | null
  housing_characteristics: string | null
  profile: RegionProfile | null
}

export interface Category {
  id: number
  slug: string
  display_name: string
  sort_order: number
}

/** 제목 + 한 줄 설명으로 이루어진 카드 (서비스 안내 · 진행 절차 · 지역별 의뢰 유형) */
export interface ContentCard {
  title: string
  desc: string
}

/**
 * 키워드 단위 콘텐츠 자산 (suri_repair_keywords.content jsonb).
 *
 * 이 키워드에 붙은 모든 지역 페이지가 그대로 상속한다. 지역마다 달라야 하는 텍스트는
 * 여기가 아니라 PageLocal에 넣는다 — 여기에 지역명을 박으면 상속받는 순간 틀린 글이 된다.
 */
/** 지역 유형(RegionProfile.type)에 해당할 때만 후보가 되는 문장. types가 비면 전 지역 공통. */
export interface PooledCard extends ContentCard {
  types?: string[]
}

export interface PooledSection {
  title: string
  body: string
  types?: string[]
  /** 롱폼의 마지막 문단으로 고정 (문의 안내). 뽑기 대상에서 빠진다. */
  final?: boolean
}

/**
 * 지역 페이지 본문을 조립할 때 쓰는 문장 풀.
 *
 * 완성된 본문을 페이지마다 저장하지 않고 여기서 조립하는 이유: 페이지가 1,479건이라
 * 완성본을 저장하면 같은 문장이 수백 번 중복 저장되고, 문장 하나를 고치려면 전 페이지를
 * 다시 써야 한다. 조립은 (키워드, 지역) 해시로 결정되므로 몇 번을 빌드해도 같은 결과다.
 */
export interface KeywordLocalPool {
  /** 지역 유형 → 히어로 한 줄의 뒷부분 */
  angles: Record<string, string>
  /** 롱폼 리드에서 지역 특성 문장 뒤에 붙는 공통 문단 */
  lead_tail: string
  requests: PooledCard[]
  sections: PooledSection[]
}

export interface KeywordContent {
  tagline: string
  services: ContentCard[]
  process: ContentCard[]
  symptoms: string[]
  why_pro: string[]
  faqs: GuideFaq[]
  local_pool: KeywordLocalPool | null
}

export interface RepairKeyword {
  id: number
  category_id: number
  slug: string
  display_name: string
  description: string | null
  default_phone: string | null
  menu_order: number
  content: KeywordContent | null
}

export type PageType = 'CATEGORY' | 'TOPIC' | 'CASE' | 'WIKI' | 'AREA' | 'LANDING'
export type ContentType = 'CT1' | 'CT2' | 'CT3' | 'CT4' | 'CT5' | 'CT6'
export type Decision = 'CREATE' | 'UPDATE' | 'MERGE' | 'HOLD'

export interface GuideStep {
  num: number
  title: string
  desc: string
  tip: string | null
}

export interface GuideFaq {
  q: string
  a: string
}

/** 표·목록·단계처럼 구조가 살아야 렌더링되는 본문 (suri_pages.guide jsonb) */
export interface PageGuide {
  summary: string
  symptoms: string[]
  steps: GuideStep[]
  prevention_tips: string[]
  faqs: GuideFaq[]
}

/**
 * 지역 단위 본문 변주 (suri_pages.local jsonb).
 *
 * 키워드 자산(KeywordContent)이 "이 수리는 무엇인가"를 담는다면 여기는 "이 동네에서는
 * 어떤가"를 담는다. 두 지역 페이지가 실질적으로 다른 글이 되는 건 전적으로 이 값 때문이다 —
 * 여기가 비면 지역명만 바뀐 복붙 페이지가 되므로 채우지 않은 페이지는 발행하지 않는다.
 */
export interface PageLocal {
  /** 히어로 H1 바로 아래 한 줄. 예) "강남구·서초구·송파구 — 아파트 부분 도배 위주" */
  hero_line: string
  /** "이 지역에서 많이 받는 의뢰" 카드 */
  top_requests: ContentCard[]
  longform: {
    lead: string
    sections: { title: string; body: string }[]
  }
  /** 출장 범위를 묻는 지역 특화 FAQ 한 문항. 답변에 실제 동 이름이 들어간다. */
  region_faq: GuideFaq | null
}

export interface Page {
  id: number
  page_type: PageType
  content_type: ContentType
  slug: string | null
  region_id: number | null
  repair_keyword_id: number | null
  category_id: number | null
  source_case_id: number | null
  search_intent: string
  required_modules: string[]
  selected_modules: string[]
  module_order: string[]
  meta_title: string | null
  meta_description: string | null
  decision: Decision
  merged_into_page_id: number | null
  diy_vs_pro: string | null
  area_served: string | null
  seo_keywords: string[]
  lsi_keywords: string[]
  /** 초기 CASE 기반 6개 페이지의 본문. 신규 페이지는 local을 쓴다. */
  guide: PageGuide | null
  local: PageLocal | null
}

// 운영자가 관리 화면에서 올린 실제 현장 사진. 없으면 lib/photos.ts의 대체 이미지를 쓴다.
export type PageImageRole = 'BEFORE' | 'PROCESS' | 'AFTER' | 'MATERIAL' | 'TOOL' | 'EXCLUDE'

export interface PageImage {
  id: number
  page_id: number
  role: PageImageRole
  url: string
  overlay_note: string | null
  sort_order: number
}

// 키워드 단위 사진 세트(suri_keyword_images). 조합 페이지가 1,300건을 넘어 페이지마다
// 사진을 넣을 수 없으므로, 키워드에 한 번 올리면 그 키워드의 모든 지역 페이지가 물려받는다.
// 같은 set_no끼리 한 세트(전/후 + 과정)이고 caption은 세트 안에서 같은 값을 쓴다.
export type KeywordImageRole = 'BEFORE' | 'AFTER' | 'PROCESS'

export interface KeywordImage {
  id: number
  repair_keyword_id: number
  set_no: number
  role: KeywordImageRole
  url: string
  caption: string | null
  sort_order: number
}

export interface PageSection {
  id: number
  page_id: number
  module_code: string
  sort_order: number
  heading: string | null
  body: string
}

export interface LocalPro {
  id: number
  region_id: number
  name: string
  shop_name: string | null
  phone: string
  rating: number | null
  review_count: number
  completed_jobs: number
  badges: string[]
  intro: string | null
  master_grade: string | null
  safety_certified: boolean
  distance: string | null
}
