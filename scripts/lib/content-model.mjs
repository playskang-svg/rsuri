import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const GUIDE_PATH = join(HERE, '..', 'data', 'ct-mod-v0.6.json')

export const CT_MOD_GUIDE = JSON.parse(readFileSync(GUIDE_PATH, 'utf8'))

const moduleCodes = Object.keys(CT_MOD_GUIDE.modules)
const moduleCodeSet = new Set(moduleCodes)

if (CT_MOD_GUIDE.version !== '0.6') throw new Error('CT·MOD 가이드는 v0.6이어야 합니다')
if (Object.keys(CT_MOD_GUIDE.content_types).length !== 6) throw new Error('CT1~CT6 정의가 필요합니다')
if (moduleCodes.length !== 28) throw new Error('M01~M28 정의가 필요합니다')
for (let i = 1; i <= 28; i += 1) {
  const code = `M${String(i).padStart(2, '0')}`
  if (!moduleCodeSet.has(code)) throw new Error(`누락된 모듈: ${code}`)
}

export function buildLandingBlueprint({ hasImages, hasFaqs, hasCta = true, hasVerifiedRegion = false }) {
  const contentType = 'CT1'
  const requiredModules = [...CT_MOD_GUIDE.content_types[contentType].required_modules]
  const selectedModules = []
  if (hasImages) selectedModules.push('M20')
  if (hasFaqs) selectedModules.push('M21')
  if (hasCta) selectedModules.push('M24')
  if (hasVerifiedRegion && selectedModules.length < 4) selectedModules.push('M28')

  // 현재 LANDING 화면의 실제 노출 순서와 동일하다. CT별 모듈 순서는 검색 질문에 따라
  // 바꿀 수 있다는 v0.6 규칙을 적용하되, 필수·옵션 집합은 원문 조합표 그대로 유지한다.
  const preferredOrder = ['M01', 'M20', 'M03', 'M04', 'M09', 'M28', 'M21', 'M24']
  const active = new Set([...requiredModules, ...selectedModules])
  const moduleOrder = preferredOrder.filter((code) => active.has(code))

  return { contentType, requiredModules, selectedModules, moduleOrder }
}

export function validateBlueprint(page) {
  const ct = CT_MOD_GUIDE.content_types[page.content_type]
  if (!ct) throw new Error(`${page.search_intent}: 알 수 없는 CT ${page.content_type}`)
  const required = ct.required_modules.filter((code) => moduleCodeSet.has(code))
  if (JSON.stringify(page.required_modules) !== JSON.stringify(required)) {
    throw new Error(`${page.search_intent}: ${page.content_type} 필수 모듈 조합이 v0.6과 다릅니다`)
  }
  const allowed = new Set(ct.optional_modules)
  for (const code of page.selected_modules) {
    if (!allowed.has(code)) throw new Error(`${page.search_intent}: ${page.content_type}에서 ${code}는 옵션 모듈이 아닙니다`)
  }
  const all = [...page.required_modules, ...page.selected_modules]
  if (new Set(all).size !== all.length) throw new Error(`${page.search_intent}: 필수·옵션 모듈이 중복됩니다`)
  if (new Set(page.module_order).size !== page.module_order.length) throw new Error(`${page.search_intent}: module_order가 중복됩니다`)
  if (page.module_order.length !== all.length || all.some((code) => !page.module_order.includes(code))) {
    throw new Error(`${page.search_intent}: module_order가 선택된 모듈 집합과 다릅니다`)
  }
  if (page.selected_modules.length < 2 || page.selected_modules.length > 4) {
    throw new Error(`${page.search_intent}: 옵션 모듈은 v0.6 운영 기준인 2~4개여야 합니다`)
  }
  if (page.selected_modules.includes('M19') && !page.source_case_id) {
    throw new Error(`${page.search_intent}: M19는 실제 CASE 근거가 필요합니다`)
  }
  if (page.selected_modules.includes('M20') && page.image_set.length === 0) {
    throw new Error(`${page.search_intent}: M20은 실제 이미지 근거가 필요합니다`)
  }
  if (page.selected_modules.includes('M25') && !page.source_case_id) {
    throw new Error(`${page.search_intent}: M25는 source_case의 실제 견적·단가 근거가 필요합니다`)
  }
}
