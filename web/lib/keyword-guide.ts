// 키워드 허브(/{keyword})가 화면에 뿌릴 본문 콘텐츠.
//
// ── 왜 이 파일이 필요한가 ──
// 증상·수리 절차·FAQ는 지역 랜딩 페이지(suri_pages.guide)에만 들어 있다. 그런데 그 내용은
// 지역이 아니라 '수리 종류' 단위로 쓰였다 — seed.mjs가 mock.wikiGuide 한 벌을 그 키워드의
// 모든 지역 랜딩에 그대로 복사한다. 즉 허브에서도 같은 내용을 보여줄 수 있고, 보여줘야 한다.
// 허브가 지역 카드 목록만 있는 빈 껍데기면 방문자는 읽을 게 없어서 그냥 나간다.
//
// 키워드에 지역 랜딩이 한 건도 없으면(기본 키워드 129개가 그렇다) 고유 콘텐츠가 없다.
// 이때는 없는 기술 내용을 지어내지 않고, 어느 공종에나 사실인 '상담 → 방문 → 시공' 흐름과
// 상담 방식 FAQ로 채운 뒤 generic 플래그를 세운다. 화면에서 제목을 달리 달기 위해서다.

import type { GuideFaq, GuideStep, Page, PageGuide } from './types'

export interface KeywordContent {
  summary: string | null
  symptoms: string[]
  steps: GuideStep[]
  preventionTips: string[]
  faqs: GuideFaq[]
  diyVsPro: string | null
  /** 키워드 고유 콘텐츠가 없어 공통 상담 흐름으로 채웠는지 */
  generic: boolean
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

const GENERIC_FAQS: GuideFaq[] = [
  {
    q: '사진만 보고도 상담이 되나요?',
    a: '손상 부위와 주변이 같이 나온 사진 2~3장이면 원인과 대략적인 작업 범위를 잡을 수 있습니다. 다만 최종 판단은 방문 진단에서 합니다 — 사진에서는 이어진 부분의 상태가 가려지는 경우가 많습니다.',
  },
  {
    q: '우리 동네도 출장이 되나요?',
    a: '아래 출장 지역 목록에서 동네를 확인해 주세요. 목록에 없더라도 인접 지역이면 가능한 경우가 있으니, 지역명과 함께 문의를 남겨 주시면 확인해 드립니다.',
  },
  {
    q: '전화를 걸었는데 연결이 안 됩니다.',
    a: '작업 중에는 전화를 받기 어렵습니다. 사진과 지역, 수리 내용을 문자로 남겨 주시면 이동 중이나 작업이 끝난 뒤 확인해 연락드립니다.',
  },
  {
    q: '전체를 다 바꿔야 하나요, 부분만 고칠 수 있나요?',
    a: '손상 범위에 따라 갈립니다. 한 자리만 손봐서 끝나는 경우도 있고, 이어진 자재를 함께 손대야 자국이 남지 않는 경우도 있습니다. 방문 진단에서 두 경우의 차이를 설명드리고 고르시게 합니다.',
  },
]

/** 콘텐츠가 가장 많이 들어 있는 랜딩을 고른다 — 같은 키워드면 내용은 같고 누락만 다르다. */
function richest(landings: Page[]): Page | null {
  let best: Page | null = null
  let bestScore = -1
  for (const p of landings) {
    const g = p.guide
    if (!g) continue
    // 절차는 페이지의 뼈대라 가중치를 준다. 동점이면 id가 작은 쪽 —
    // 빌드마다 같은 결과가 나와야 정적 출력이 흔들리지 않는다.
    const score =
      g.symptoms.length + g.steps.length * 2 + g.faqs.length + g.prevention_tips.length
    if (score > bestScore || (score === bestScore && best && p.id < best.id)) {
      best = p
      bestScore = score
    }
  }
  return bestScore > 0 ? best : null
}

/**
 * 키워드 허브에 뿌릴 본문. landings는 그 키워드의 발행된 LANDING 페이지들.
 * fallbackSummary는 보통 keyword.description을 넘긴다.
 */
export function buildKeywordContent(
  landings: Page[],
  fallbackSummary: string | null,
): KeywordContent {
  const source = richest(landings)
  const guide: PageGuide | null = source?.guide ?? null

  if (!guide) {
    return {
      summary: fallbackSummary,
      symptoms: [],
      steps: GENERIC_STEPS,
      preventionTips: [],
      faqs: GENERIC_FAQS,
      diyVsPro: null,
      generic: true,
    }
  }

  return {
    summary: guide.summary || fallbackSummary,
    symptoms: guide.symptoms,
    steps: guide.steps,
    preventionTips: guide.prevention_tips,
    // 키워드 고유 FAQ가 비어 있으면 상담 방식 FAQ라도 남긴다 — FAQ가 통째로 사라지는 것보다 낫다.
    faqs: guide.faqs.length > 0 ? guide.faqs : GENERIC_FAQS,
    diyVsPro: source?.diy_vs_pro ?? null,
    generic: false,
  }
}
