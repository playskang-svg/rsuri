// 운영 중인 사이트 모음 — /site 페이지가 그리는 도메인 트리.
//
// ── 왜 코드에 두는가 ──
// 이건 방문자 콘텐츠가 아니라 운영 자산 목록이다. 키워드·지역처럼 수천 건으로 늘지 않고
// (도메인 3개 · 사이트 9개), 바뀌는 일도 드물다. DB 테이블과 관리 화면을 새로 파는 것보다
// 이 파일 한 장을 고치는 편이 싸다. 사이트가 수십 개로 늘면 그때 DB로 옮긴다.
//
// ── 출처 ──
// 2026-09-06, 로컬 저장소의 배포 설정에서 모았다:
//   suriwiki.com          web/wrangler.jsonc (이 저장소)
//   battery.suriwiki.com  ~/dev/battery/wrangler.jsonc      (name: baro-battery)
//   isatips.adbles.com    ~/dev/isatipsadbles/wrangler.jsonc (name: moving-guide-korea)
//   japan.noluga.com      ~/dev/japantravelsite/wrangler.jsonc (name: japantravel-site)
//   나머지 adbles 서브도메인 ~/dev/adbles 문서에서 확인
//
// ⚠️ 설명 문구는 배포 설정에 없어서 저장소 문서에서 읽었다. 운영자가 보고 고칠 것.

export type SiteStatus = 'live' | 'moved' | 'prep'

export interface SiteNode {
  /** 표시용 호스트명 */
  host: string
  /** 사람이 부르는 이름 */
  name: string
  desc: string
  /** 내부 경로(`/`로 시작)면 같은 탭, 아니면 새 탭으로 연다 */
  href: string
  status: SiteStatus
  /** 상태나 이력에 대한 한 줄 — 있으면 노드 아래 작게 붙는다 */
  note?: string
}

export interface DomainGroup {
  /** 최상위 도메인 — 트리의 뿌리 */
  host: string
  label: string
  desc: string
  href: string
  status: SiteStatus
  sites: SiteNode[]
}

export const SITE_NETWORK: DomainGroup[] = [
  {
    host: 'suriwiki.com',
    label: '수리위키',
    desc: '집수리 증상별·지역별 시공 안내. 지금 보고 계신 사이트입니다.',
    href: '/',
    status: 'live',
    sites: [
      {
        host: 'suriwiki.com',
        name: '수리 분야',
        desc: '문·창호·도배·바닥·누수 등 수리 항목을 증상 단위로 나눈 안내 페이지.',
        href: '/#services',
        status: 'live',
      },
      {
        host: 'suriwiki.com',
        name: '지역별 안내',
        desc: '동네마다 주거 특성과 담당 마스터를 붙인 지역 페이지.',
        href: '/#regions',
        status: 'live',
      },
      {
        host: 'battery.suriwiki.com',
        name: '바로배터리',
        desc: '자동차 배터리 출장 교체 안내.',
        href: 'https://battery.suriwiki.com',
        status: 'live',
      },
    ],
  },
  {
    host: 'adbles.com',
    label: '애드블스',
    desc: '생활 정보와 무료 웹도구를 주제별 서브도메인으로 나눠 운영합니다.',
    href: 'https://adbles.com',
    status: 'live',
    sites: [
      {
        host: 'isatips.adbles.com',
        name: '이사 가이드',
        desc: '이사 준비 절차와 체크리스트, 지역별 안내.',
        href: 'https://isatips.adbles.com',
        status: 'live',
      },
      {
        host: 'myreceipt.adbles.com',
        name: '영수증 정리도우미',
        desc: '영수증 여러 장을 올려 상호·날짜·금액을 확인하고 A4 PDF로 내려받는 도구.',
        href: 'https://myreceipt.adbles.com',
        status: 'live',
      },
      {
        host: 'proshot.adbles.com',
        name: '프로샷',
        desc: '이미지 관련 웹도구.',
        href: 'https://proshot.adbles.com',
        status: 'live',
        note: '설명 확인 필요 — 배포 설정에 소개 문구가 없습니다.',
      },
      {
        host: 'vpn.adbles.com',
        name: 'VPN 안내',
        desc: 'VPN 선택과 사용법 정리. 애드블스 도구모음에 등록된 사이트.',
        href: 'https://vpn.adbles.com',
        status: 'live',
      },
      {
        host: 'japantravel.adbles.com',
        name: '일본 여행 (구 주소)',
        desc: '일본 여행 가이드의 예전 주소입니다.',
        href: 'https://japan.noluga.com',
        status: 'moved',
        note: 'japan.noluga.com으로 옮겼습니다.',
      },
    ],
  },
  {
    host: 'noluga.com',
    label: '놀루가',
    desc: '여행 주제 사이트를 나라별 서브도메인으로 운영합니다.',
    href: 'https://noluga.com',
    status: 'live',
    sites: [
      {
        host: 'japan.noluga.com',
        name: '일본 여행 가이드',
        desc: '일본 여행 준비와 도시별 정보.',
        href: 'https://japan.noluga.com',
        status: 'live',
      },
    ],
  },
]

export const STATUS_LABEL: Record<SiteStatus, string> = {
  live: '운영 중',
  moved: '주소 이전',
  prep: '준비 중',
}

/** 내부 경로면 같은 탭, 외부면 새 탭 — 링크를 그릴 때 이 판정을 쓴다. */
export const isInternal = (href: string) => href.startsWith('/')

export const siteCount = SITE_NETWORK.reduce((n, g) => n + g.sites.length, 0)
