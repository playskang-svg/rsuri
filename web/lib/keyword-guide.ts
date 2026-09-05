// 키워드 허브(/{keyword})와 지역 페이지가 함께 쓰는 본문 콘텐츠.
//
// ── 왜 이 파일이 필요한가 ──
// 증상·수리 절차·FAQ는 지역 랜딩 페이지(suri_pages.guide)에만 들어 있다. 그런데 그 내용은
// 지역이 아니라 '수리 종류' 단위로 쓰였다 — seed.mjs가 mock.wikiGuide 한 벌을 그 키워드의
// 모든 지역 랜딩에 그대로 복사한다. 즉 허브에서도 같은 내용을 보여줄 수 있고, 보여줘야 한다.
//
// ── 왜 칸을 하나씩 채우는가 ──
// 원본이 있는 키워드는 151종 중 6종뿐이라, 없는 섹션을 그냥 감췄더니 키워드마다 페이지
// 구조가 달라졌다("문수리로 넘어가면 템플릿 구조로 안 나오는 게 많다"). 그래서 섹션을
// 통째로 감추는 대신 빈 칸만 공종 문구(lib/keyword-copy.ts)로 채운다 — 어느 키워드로
// 들어와도 증상 → 과정 → 재발 방지 → FAQ가 같은 자리에 있다.
// 키워드 고유 원본이 있으면 그쪽이 언제나 이긴다.

import { copyFor } from './keyword-copy'
import type { GuideFaq, GuideStep, Page, PageGuide } from './types'

export interface KeywordContent {
  summary: string
  symptoms: string[]
  steps: GuideStep[]
  preventionTips: string[]
  faqs: GuideFaq[]
  diyVsPro: string
  /** 시공 전/후 사진 아래 한 줄 — 공종에 맞춘 문구 */
  photoNote: string
  /** steps가 이 키워드의 실제 공정이 아니라 공통 상담 흐름인지 */
  genericSteps: boolean
}

export interface KeywordRef {
  displayName: string
  description: string | null
  categorySlug: string | null
}

// 어느 공종에서도 사실인 내용만 둔다. 비용·보증·소요시간 약속은 넣지 않는다
// (seed.mjs의 FAQ_DROP과 같은 기준 — 지키지 못할 약속은 발행하지 않는다).
const GENERIC_STEPS: GuideStep[] = [
  {
    num: 1,
    title: '사진·증상 접수',
    desc: '손상 부위와 그 주변이 함께 나온 사진 2~3장, 지역, 언제부터 그랬는지를 문자로 남겨 주세요.',
    tip: '가까이 찍은 사진만 오면 범위를 못 봅니다. 한 걸음 물러난 사진을 꼭 같이 보내 주세요.',
  },
  {
    num: 2,
    title: '방문 진단',
    desc: '담당 마스터가 현장에서 원인과 손상 범위를 직접 확인합니다. 사진으로는 가려지는 부분이 있어 이 단계가 필요합니다.',
    tip: null,
  },
  {
    num: 3,
    title: '작업 범위 협의',
    desc: '어디까지 손보고 무엇을 남길지 먼저 정합니다. 부분 보수로 끝나는지, 이어진 자재까지 봐야 하는지가 여기서 갈립니다.',
    tip: null,
  },
  {
    num: 4,
    title: '시공',
    desc: '합의한 범위대로 작업합니다. 주변 마감과 색·높이가 이어지는지 작업 중에 계속 맞춰 봅니다.',
    tip: null,
  },
  {
    num: 5,
    title: '마무리 확인',
    desc: '작업한 자리를 함께 보고, 주변 정리까지 끝낸 뒤 마칩니다.',
    tip: null,
  },
]

// 공종과 무관하게 항상 붙이는 상담 방식 FAQ — 어느 페이지로 들어와도 같은 답이 있어야 한다.
const CONTACT_FAQS: GuideFaq[] = [
  {
    q: '사진만 보고도 상담이 되나요?',
    a: '손상 부위와 주변이 같이 나온 사진 2~3장이면 원인과 대략적인 작업 범위를 잡을 수 있습니다. 다만 최종 판단은 방문 진단에서 합니다 — 사진에서는 이어진 부분의 상태가 가려지는 경우가 많습니다.',
  },
  {
    q: '전화를 걸었는데 연결이 안 됩니다.',
    a: '작업 중에는 전화를 받기 어렵습니다. 사진과 지역, 수리 내용을 문자로 남겨 주시면 이동 중이나 작업이 끝난 뒤 확인해 연락드립니다.',
  },
]

/** 콘텐츠가 가장 많이 들어 있는 랜딩을 고른다 — 같은 키워드면 내용은 같고 누락만 다르다. */
function richest(landings: Page[]): Page | null {
  let best: Page | null = null
  let bestScore = -1
  for (const p of landings) {
    const g = p.guide
    if (!g) continue
    // 절차는 페이지의 뼈대라 가중치를 준다. 동점이면 먼저 만난 쪽(= id가 작은 쪽) —
    // 빌드마다 같은 결과가 나와야 정적 출력이 흔들리지 않는다.
    const score =
      g.symptoms.length + g.steps.length * 2 + g.faqs.length + g.prevention_tips.length
    if (score > bestScore) {
      best = p
      bestScore = score
    }
  }
  return bestScore > 0 ? best : null
}

/** 질문이 이미 있으면 다시 붙이지 않는다. 공백·물음표 차이는 무시한다. */
function mergeFaqs(own: GuideFaq[], extra: GuideFaq[]): GuideFaq[] {
  const key = (q: string) => q.replace(/[\s?？]/g, '')
  const seen = new Set(own.map((f) => key(f.q)))
  return [...own, ...extra.filter((f) => !seen.has(key(f.q)))]
}

/**
 * 페이지 본문을 만든다. landings는 이 키워드의 발행된 LANDING 페이지들
 * (지역 페이지에서는 자기 자신 한 건만 넘겨도 된다).
 */
export function buildKeywordContent(landings: Page[], keyword: KeywordRef): KeywordContent {
  const source = richest(landings)
  const guide: PageGuide | null = source?.guide ?? null
  const copy = copyFor(keyword.displayName, keyword.categorySlug)

  const ownFaqs = guide?.faqs ?? []
  const hasOwnSteps = (guide?.steps.length ?? 0) > 0

  return {
    summary:
      guide?.summary ||
      keyword.description ||
      `${keyword.displayName} — 어떤 증상일 때 손봐야 하는지, 어떤 순서로 진행하는지 정리했습니다.`,
    symptoms: guide?.symptoms.length ? guide.symptoms : copy.symptoms,
    steps: hasOwnSteps ? guide!.steps : GENERIC_STEPS,
    preventionTips: guide?.prevention_tips.length ? guide.prevention_tips : copy.preventionTips,
    // 고유 FAQ가 있으면 그것을 앞에 두고, 공종 FAQ와 상담 FAQ를 뒤에 이어 붙인다.
    faqs: mergeFaqs(ownFaqs.length ? ownFaqs : copy.faqs, [
      ...(ownFaqs.length ? copy.faqs : []),
      ...CONTACT_FAQS,
    ]),
    diyVsPro: source?.diy_vs_pro || copy.diyVsPro,
    photoNote: copy.photoNote,
    genericSteps: !hasOwnSteps,
  }
}
