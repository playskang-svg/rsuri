// 모든 페이지 푸터 위의 어두운 상담 띠 — --ink-2 + 블루프린트 그리드.
// 문구는 사이트가 이미 하는 약속만. h1·원칙 01이 '바꾸기 전에 고칠 수 있는지'를 이미 말하므로
// 여기서는 홈 lead 원문의 다른 약속('사진 한 장이면 진단 시작')을 쓴다 — 같은 문장을 세 번 만나지 않게.
import { telHrefOf } from '@/lib/contact'

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export function CtaBand({ phone }: { phone?: string }) {
  return (
    <section className="cta-band blueprint" aria-label="상담 안내">
      <div className="inner">
        <div data-reveal="up">
          <p className="label-mono">상담</p>
          <h2>
            사진 한 장이면
            <br />
            진단을 시작할 수 있어요.
          </h2>
          <p className="cta-note">작업 중에는 전화를 받기 어려운 시간이 많습니다 — 카카오톡 채널로 사진과 지역을 보내주세요.</p>
        </div>
        <div className="cta-btns">
          <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call">
            카카오톡으로 사진 상담
          </a>
          {phone && (
            <a href={telHrefOf(phone)} className="btn-ghost-dark">
              {phone}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
