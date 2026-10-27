// 모바일 하단 고정 상담바 — layout에 1회. md 이상은 숨긴다(globals.css .consult-bar).
// 본문 끝이 가리지 않게 body에 하단 여백을 준다(globals.css body padding-bottom).

import { telHrefOf } from '@/lib/contact'

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export function MobileConsultBar({ phone }: { phone: string }) {
  return (
    <div className="consult-bar" aria-label="상담">
      <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call">
        카카오 사진 상담
      </a>
      <a href={telHrefOf(phone)} className="btn-ghost">
        전화
      </a>
    </div>
  )
}
