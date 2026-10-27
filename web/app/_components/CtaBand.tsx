// 모든 페이지 푸터 위의 어두운 상담 띠 — --ink-2 + 블루프린트 그리드.
// 문구는 사이트가 이미 하는 약속(교체보다 보수·복원이 되는지 먼저 본다)만.
import { telHrefOf } from '@/lib/contact'

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export function CtaBand({ phone }: { phone?: string }) {
  return (
    <section className="cta-band blueprint" aria-label="상담 안내">
      <div className="inner">
        <div data-reveal="up">
          <p className="label-mono">상담</p>
          <h2>
            바꾸기 전에,
            <br />
            고칠 수 있는지 봅니다.
          </h2>
        </div>
        <div className="cta-btns">
          <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call">
            사진으로 상담하기
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
