import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const dataPath = (name) => join(HERE, '..', 'data', name)

export const CT_MOD_GUIDE = JSON.parse(readFileSync(dataPath('ct-mod-v0.6.json'), 'utf8'))
export const KEYWORD_INTENT = JSON.parse(readFileSync(dataPath('keyword-intent.json'), 'utf8'))

const MODULE_CODES = Object.keys(CT_MOD_GUIDE.modules)
const MODULE_SET = new Set(MODULE_CODES)

// 정본 파일이 원문에서 어긋나면 빌드를 세운다. 여기서 막지 않으면 축약된 정본이
// 그대로 검증 기준이 되어, 검증을 통과했다는 사실이 아무것도 보장하지 않게 된다.
if (CT_MOD_GUIDE.version !== '0.6') throw new Error('CT·MOD 가이드는 v0.6이어야 합니다')
if (Object.keys(CT_MOD_GUIDE.content_types).length !== 6) throw new Error('CT1~CT6 정의가 필요합니다')
if (MODULE_CODES.length !== 28) throw new Error('M01~M28 정의가 필요합니다')
for (let i = 1; i <= 28; i += 1) {
  const code = `M${String(i).padStart(2, '0')}`
  if (!MODULE_SET.has(code)) throw new Error(`누락된 모듈: ${code}`)
}
for (const [code, ct] of Object.entries(CT_MOD_GUIDE.content_types)) {
  for (const m of [...ct.required_modules, ...ct.optional_modules]) {
    if (!MODULE_SET.has(m)) throw new Error(`${code}: 알 수 없는 모듈 ${m}`)
  }
  for (const group of ct.required_one_of ?? []) {
    for (const m of group.candidates) {
      if (!MODULE_SET.has(m)) throw new Error(`${code}: 알 수 없는 비교/선택 후보 ${m}`)
    }
  }
}

// LANDING 화면이 실제로 그리는 순서. 문서 10절이 module_order를 "본문에 배치된 모듈 순서"로
// 정의하므로, 이 배열이 page.tsx의 섹션 순서와 어긋나면 저장값이 거짓말이 된다.
export const LANDING_RENDER_ORDER = [
  'M01', 'M28', 'M20', 'M03', 'M05', 'M06', 'M04', 'M09', 'M08', 'M10', 'M07', 'M17', 'M19', 'M21', 'M24',
]

// 문서의 CT·MOD는 본문 모듈 조합을 규정한다. 아래 두 블록은 글이 아니라 사이트 내비게이션이라
// module_order 밖에 둔다. CT1 옵션표에 M22가 없다는 이유로 내부링크를 끄면 키워드끼리
// 홈을 거치지 않고는 서로 연결되지 않는다 — 문서가 의도한 결과가 아니다.
export const SITE_CHROME_MODULES = ['M22', 'M23']

// 문서 07절 "필수 모듈의 실제 근거가 없으면 문장을 만들어 채우지 않고 CT를 바꾸거나 HOLD".
// CT1의 운영 메모가 지정한 "원인 근거가 없으면 CT5 검토"를 그대로 옮긴 것이 CT1 → CT5다.
const FALLBACK_CHAIN = {
  CT1: ['CT5'],
  CT2: ['CT1'],
  CT3: ['CT1'],
  CT4: ['CT1'],
  CT5: ['CT1'],
  CT6: ['CT1'],
}

// 문서 07절 "CASE 기반 WIKI와 LANDING은 M19 실제 CASE 근거와 M20 사진·오버레이를 우선 사용".
// 그 뒤로는 지역 차별화(M28) → 질문 보강(M21) → 다음 행동(M24) 순으로 둔다.
const OPTIONAL_PRIORITY = [
  'M19', 'M20', 'M28', 'M21', 'M24',
  'M27', 'M26', 'M07', 'M17', 'M05', 'M06', 'M25', 'M15', 'M16', 'M14', 'M13', 'M18', 'M11', 'M12', 'M04', 'M09',
]

const OPTIONAL_RANGE = CT_MOD_GUIDE.rules.normal_optional_module_count

/** CT 하나의 필수 모듈을 해석한다. required_one_of("M11 또는 M12", "비교대상 모듈 1개 이상")를 근거로 고른다. */
export function resolveRequired(contentType, evidence) {
  const ct = CT_MOD_GUIDE.content_types[contentType]
  if (!ct) throw new Error(`알 수 없는 CT: ${contentType}`)

  const modules = [...ct.required_modules]
  const missing = ct.required_modules.filter((code) => !evidence[code])

  for (const group of ct.required_one_of ?? []) {
    const available = group.candidates.filter((code) => evidence[code])
    if (available.length < group.min) {
      missing.push(`${group.label}(${group.candidates.join('/')})`)
      continue
    }
    modules.push(...available.slice(0, group.min))
  }

  return { modules, missing, ok: missing.length === 0 }
}

/** 문서 08절 4단계 — 의도한 CT부터 시도하고, 근거가 없으면 CT를 내리거나 HOLD로 돌린다. */
export function selectContentType(intendedContentType, evidence) {
  const chain = [intendedContentType, ...(FALLBACK_CHAIN[intendedContentType] ?? [])]
  const attempts = []

  for (const contentType of chain) {
    const required = resolveRequired(contentType, evidence)
    if (required.ok) {
      return {
        contentType,
        requiredModules: required.modules,
        intendedContentType,
        fellBack: contentType !== intendedContentType,
        blockedBy: attempts,
      }
    }
    attempts.push({ contentType, missing: required.missing })
  }

  return { contentType: null, requiredModules: [], intendedContentType, fellBack: false, blockedBy: attempts }
}

/**
 * 문서 08절 5·6단계 — 필수 모듈로 뼈대를 세우고, 실제 근거가 있는 옵션 모듈을 2~4개 얹는다.
 * danger가 true면 07절에 따라 M16을 필수로 승격한다.
 */
export function buildLandingBlueprint({ intendedContentType, evidence, danger = false }) {
  const selection = selectContentType(intendedContentType, evidence)

  if (!selection.contentType) {
    return {
      contentType: intendedContentType,
      requiredModules: [],
      selectedModules: [],
      moduleOrder: [],
      decision: 'HOLD',
      intendedContentType,
      fellBack: false,
      holdReason: selection.blockedBy
        .map((a) => `${a.contentType} 필수 모듈 근거 없음: ${a.missing.join('·')}`)
        .join(' / '),
    }
  }

  const { contentType } = selection
  const ct = CT_MOD_GUIDE.content_types[contentType]
  const requiredModules = [...selection.requiredModules]

  // 07절: 전기·가스·구조·심한 누수·고소작업이면 M16을 자동 필수로 올린다.
  if (danger && !requiredModules.includes('M16')) {
    if (!evidence.M16) {
      return {
        contentType,
        requiredModules,
        selectedModules: [],
        moduleOrder: [],
        decision: 'HOLD',
        intendedContentType,
        fellBack: selection.fellBack,
        holdReason: '위험 작업이라 M16 안전·중단 기준이 필수인데 근거가 없습니다',
      }
    }
    requiredModules.push('M16')
  }

  const alreadyUsed = new Set(requiredModules)
  const selectedModules = OPTIONAL_PRIORITY.filter(
    (code) => ct.optional_modules.includes(code) && evidence[code] && !alreadyUsed.has(code),
  ).slice(0, OPTIONAL_RANGE.max)

  const active = new Set([...requiredModules, ...selectedModules])
  const moduleOrder = LANDING_RENDER_ORDER.filter((code) => active.has(code))

  return {
    contentType,
    requiredModules,
    selectedModules,
    moduleOrder,
    decision: 'CREATE',
    intendedContentType,
    fellBack: selection.fellBack,
    holdReason: null,
  }
}

/** 빌드 결과가 문서의 조합 규칙을 지켰는지 되짚는다. 조립기와 검증기를 일부러 따로 둔다. */
export function validateBlueprint(page) {
  const label = page.search_intent
  if (page.decision === 'HOLD') return

  const ct = CT_MOD_GUIDE.content_types[page.content_type]
  if (!ct) throw new Error(`${label}: 알 수 없는 CT ${page.content_type}`)

  // 필수 모듈 — 고정 필수는 전부 있어야 하고, required_one_of는 후보 중 min개가 있어야 한다.
  for (const code of ct.required_modules) {
    if (!page.required_modules.includes(code)) {
      throw new Error(`${label}: ${page.content_type} 필수 모듈 ${code}가 빠졌습니다`)
    }
  }
  for (const group of ct.required_one_of ?? []) {
    const picked = group.candidates.filter((code) => page.required_modules.includes(code))
    if (picked.length < group.min) {
      throw new Error(`${label}: ${page.content_type}는 ${group.label}을 ${group.min}개 이상 필요로 합니다`)
    }
  }
  const allowedRequired = new Set([
    ...ct.required_modules,
    ...(ct.required_one_of ?? []).flatMap((g) => g.candidates),
    ...(page.required_modules.includes('M16') ? ['M16'] : []),
  ])
  for (const code of page.required_modules) {
    if (!allowedRequired.has(code)) {
      throw new Error(`${label}: ${code}는 ${page.content_type}의 필수 모듈이 아닙니다`)
    }
  }

  // 옵션 모듈 — 조합표 밖의 모듈을 끼워 넣지 않는다.
  const allowedOptional = new Set(ct.optional_modules)
  for (const code of page.selected_modules) {
    if (!allowedOptional.has(code)) {
      throw new Error(`${label}: ${page.content_type}에서 ${code}는 옵션 모듈이 아닙니다`)
    }
  }

  const all = [...page.required_modules, ...page.selected_modules]
  if (new Set(all).size !== all.length) throw new Error(`${label}: 필수·옵션 모듈이 중복됩니다`)
  if (new Set(page.module_order).size !== page.module_order.length) {
    throw new Error(`${label}: module_order가 중복됩니다`)
  }
  if (page.module_order.length !== all.length || all.some((code) => !page.module_order.includes(code))) {
    throw new Error(`${label}: module_order가 선택된 모듈 집합과 다릅니다`)
  }

  // module_order는 "본문에 배치된 모듈 순서"다. 실제 렌더 순서와 어긋나면 저장값이 거짓이 된다.
  const rendered = LANDING_RENDER_ORDER.filter((code) => page.module_order.includes(code))
  if (rendered.join('>') !== page.module_order.join('>')) {
    throw new Error(`${label}: module_order가 화면의 실제 배치 순서와 다릅니다`)
  }
  for (const code of page.module_order) {
    if (SITE_CHROME_MODULES.includes(code)) {
      throw new Error(`${label}: ${code}는 사이트 내비게이션이라 본문 모듈로 셀 수 없습니다`)
    }
  }

  if (page.selected_modules.length < OPTIONAL_RANGE.min || page.selected_modules.length > OPTIONAL_RANGE.max) {
    throw new Error(
      `${label}: 옵션 모듈은 v0.6 운영 기준인 ${OPTIONAL_RANGE.min}~${OPTIONAL_RANGE.max}개여야 합니다 (현재 ${page.selected_modules.length}개)`,
    )
  }

  // 근거를 요구하는 모듈들 — 숫자·사진·사례를 지어내지 않게 막는 자리다.
  if (page.selected_modules.includes('M19') && !page.source_case_id) {
    throw new Error(`${label}: M19는 실제 CASE 근거가 필요합니다`)
  }
  if (page.selected_modules.includes('M20') && page.image_set.length === 0) {
    throw new Error(`${label}: M20은 실제 이미지 근거가 필요합니다`)
  }
  if (page.selected_modules.includes('M25') && !page.source_case_id) {
    throw new Error(`${label}: M25는 source_case의 실제 견적·단가 근거가 필요합니다`)
  }
}
