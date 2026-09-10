// 키워드 콘텐츠 검증 — docs/RENEWAL_INSTRUCTIONS.md 4번, docs/CONTENT_MODEL.md 기준.
//
// 왜 자동으로 재나: 콘텐츠 JSON 하나가 한 키워드의 모든 지역 페이지로 상속된다.
// 규칙 하나를 어기면 그 키워드에 붙은 수십~수백 페이지가 한꺼번에 틀린 글이 되는데,
// 눈으로 읽어서는 "angles에 유형 하나가 빠졌다" 같은 걸 잡을 수 없다.
//
//   node scripts/check-content.mjs            전체 검사
//   node scripts/check-content.mjs door-repair  하나만
//
// 검사 항목
//   1. content에 지역명이 박혀 있지 않은가   — 모든 지역이 상속하므로 지역명은 곧 오류
//   2. local_pool.angles가 8개 지역 유형을 전부 덮는가 — 빠진 유형은 빈 페이지가 된다
//   3. sections에 final:true가 정확히 하나인가 — 문의 안내는 항상 마지막 자리
//   4. types에 없는 유형 이름을 쓰지 않았는가 — 오타 하나로 그 문장이 영영 안 뽑힌다
//   5. 필수 필드가 비어 있지 않은가
//   6. 안전이 걸린 키워드면 중단 기준을 다루는가 — PRD 5번 M16 승격 규칙

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = resolve(HERE, 'data')
const CONTENT_DIR = join(DATA, 'keyword-content')

const profiles = JSON.parse(readFileSync(join(DATA, 'region-profiles.json'), 'utf8'))
const TYPES = Object.keys(profiles._types)
const REGION_NAMES = Object.keys(profiles.regions).filter((k) => !k.startsWith('_'))

// 프로필에 등재된 지역명 + 시·도 이름. content(전 지역 상속분)에 이 중 하나라도
// 들어가면 상속받는 순간 틀린 글이 된다.
const SIDO = [
  '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]
const PLACE_WORDS = [...new Set([...REGION_NAMES, ...SIDO])].sort((a, b) => b.length - a.length)

// 전기·가스·구조·누수·고소작업이면 M16(안전·중단 기준)이 필수로 승격된다 — PRD 5번.
const SAFETY_SLUGS = /electric|gas|leak|water|boiler|structure|roof|exterior|balcony/
const SAFETY_WORDS = ['안전', '중단', '차단', '위험', '전문가', '누전', '가스']

function walkStrings(node, path, out) {
  if (typeof node === 'string') {
    out.push([path, node])
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => walkStrings(v, `${path}[${i}]`, out))
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walkStrings(v, path ? `${path}.${k}` : k, out)
  }
}

function checkOne(file) {
  const problems = []
  const warnings = []
  const parsed = JSON.parse(readFileSync(join(CONTENT_DIR, file), 'utf8'))
  const slug = parsed.keyword_slug ?? file.replace(/\.json$/, '')
  const content = parsed.content

  if (!content) {
    problems.push('content가 없다')
    return { slug, problems, warnings }
  }

  // 1. 지역명 검사 — _note 같은 메타 필드는 사람이 읽는 주석이라 뺀다.
  // content(전 지역 상속분)는 물론 local_pool(조립 재료)도 함께 본다. 지역명은
  // compose-local이 조립할 때 따로 붙이므로, 재료에 박혀 있으면 중복되거나 어긋난다.
  const strings = []
  walkStrings(content, 'content', strings)
  walkStrings(parsed.local_pool ?? {}, 'local_pool', strings)
  for (const [path, text] of strings) {
    if (path.startsWith('_') || path.includes('._')) continue
    // local_pool은 지역별로 골라 쓰는 재료라 지역명이 들어가도 되는 자리가 아니다 —
    // 조립 결과에 지역명은 compose-local이 따로 붙인다. 여기서도 같이 본다.
    for (const place of PLACE_WORDS) {
      if (text.includes(place)) {
        problems.push(`지역명 "${place}"이(가) ${path}에 있다 — 모든 지역이 상속하므로 틀린 글이 된다`)
        break
      }
    }
  }

  // 5. 필수 필드
  for (const field of ['tagline', 'services', 'process', 'symptoms', 'why_pro', 'faqs']) {
    const v = content[field]
    if (v == null || (Array.isArray(v) && v.length === 0) || v === '') {
      problems.push(`필수 필드가 비었다: content.${field}`)
    }
  }

  // JSON 파일은 content와 local_pool을 최상위에 나눠 두고, build-page-content.mjs가
  // DB에 넣을 때 content 안으로 합친다. 어느 형태로 와도 읽는다.
  const pool = parsed.local_pool ?? content.local_pool
  if (!pool) {
    problems.push('local_pool이 없다 — 지역 페이지 본문을 조립할 재료가 없어 전부 빈 페이지가 된다')
    return { slug, problems, warnings }
  }

  // 2. angles가 8개 유형을 전부 덮는가
  const missing = TYPES.filter((t) => !pool.angles?.[t])
  if (missing.length) {
    const affected = missing
      .map((t) => Object.values(profiles.regions).filter((r) => r?.type === t).length)
      .reduce((a, b) => a + b, 0)
    problems.push(
      `angles에 빠진 지역 유형 ${missing.length}개: ${missing.join(', ')} — ` +
        `해당 유형 ${affected}개 지역이 조립 실패로 빈 페이지가 된다`,
    )
  }

  // 4. types 오타 — 없는 유형을 적으면 그 문장은 영영 안 뽑힌다
  for (const [field, list] of [['requests', pool.requests], ['sections', pool.sections]]) {
    for (const [i, item] of (list ?? []).entries()) {
      for (const t of item.types ?? []) {
        if (!TYPES.includes(t)) {
          problems.push(`local_pool.${field}[${i}].types에 없는 유형 "${t}"`)
        }
      }
    }
    for (const t of Object.keys(pool.angles ?? {})) {
      if (!TYPES.includes(t)) problems.push(`local_pool.angles에 없는 유형 "${t}"`)
    }
  }

  // 3. final:true가 정확히 하나
  const finals = (pool.sections ?? []).filter((s) => s.final)
  if (finals.length === 0) {
    problems.push('local_pool.sections에 final:true가 없다 — 롱폼이 문의 안내 없이 끝난다')
  } else if (finals.length > 1) {
    problems.push(`local_pool.sections에 final:true가 ${finals.length}개 — 마지막 자리는 하나여야 한다`)
  }

  if (!pool.lead_tail) warnings.push('local_pool.lead_tail이 비었다 — 롱폼 리드가 지역 문장만으로 끝난다')

  // 6. 안전 승격 (경고) — 근거 없이 단정하지 않기 위해 슬러그로만 좁게 본다
  if (SAFETY_SLUGS.test(slug)) {
    const all = strings.map(([, t]) => t).join(' ')
    if (!SAFETY_WORDS.some((w) => all.includes(w))) {
      warnings.push('안전이 걸리는 공종인데 중단·안전 기준을 다루는 문장이 없다 (PRD 5번 M16 승격)')
    }
  }

  // 조립이 실제로 되는지 — 유형별로 뽑을 후보가 남는지 본다.
  // angles가 있어도 그 유형에 맞는 sections가 하나도 없으면 롱폼이 문의 안내 한 문단으로 끝난다.
  for (const t of TYPES) {
    if (!pool.angles?.[t]) continue
    const usable = (pool.sections ?? []).filter(
      (s) => !s.final && (!s.types || s.types.length === 0 || s.types.includes(t)),
    )
    if (usable.length < 2) {
      warnings.push(
        `유형 ${t}에서 고를 수 있는 롱폼 문단이 ${usable.length}개뿐이다 (2개를 뽑는다)`,
      )
    }
  }

  return { slug, problems, warnings }
}

const only = process.argv[2]
const files = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !only || f === `${only}.json` || f === only)

if (!files.length) {
  console.error(only ? `키워드 콘텐츠를 찾지 못했다: ${only}` : 'scripts/data/keyword-content가 비었다')
  process.exit(1)
}

console.log(`키워드 콘텐츠 ${files.length}개 · 지역 유형 ${TYPES.length}개 · 등재 지역 ${REGION_NAMES.length}곳\n`)

let failed = 0
for (const file of files) {
  const { slug, problems, warnings } = checkOne(file)
  if (!problems.length && !warnings.length) {
    console.log(`OK  ${slug}`)
    continue
  }
  if (problems.length) failed += 1
  console.log(`${problems.length ? 'X  ' : '!  '}${slug}`)
  for (const p of problems) console.log(`      오류: ${p}`)
  for (const w of warnings) console.log(`      경고: ${w}`)
}

console.log()
if (failed) {
  console.error(`${failed}개 키워드에 오류가 있다.`)
  process.exit(1)
}
console.log('오류 없음.')
