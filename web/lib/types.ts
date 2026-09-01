// docs/PRD.md 4번 "데이터 모델" / supabase/schema.sql 과 1:1로 맞춘 타입.
// 스키마를 바꾸면 이 파일도 같이 바꾼다.

export type RegionLevel = 'SIDO' | 'SIGUNGU' | 'DONG'

export interface Region {
  id: number
  parent_id: number | null
  level: RegionLevel
  slug: string
  display_name: string
  lat: number | null
  lng: number | null
}

export interface Category {
  id: number
  slug: string
  display_name: string
  sort_order: number
}

export interface RepairKeyword {
  id: number
  category_id: number
  slug: string
  display_name: string
  description: string | null
  default_phone: string | null
  menu_order: number
}

export type PageType = 'CATEGORY' | 'TOPIC' | 'CASE' | 'WIKI' | 'AREA' | 'LANDING'
export type ContentType = 'CT1' | 'CT2' | 'CT3' | 'CT4' | 'CT5' | 'CT6'
export type Decision = 'CREATE' | 'UPDATE' | 'MERGE' | 'HOLD'

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
}
