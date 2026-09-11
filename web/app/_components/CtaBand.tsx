// 모든 페이지의 푸터 위에 붙는 어두운 상담 띠. 참고 스킨의 "짐의 양보다 먼저, 두 공간의 조건을 봅니다."
// 자리를 수리위키 말로 바꿨다 — 무엇을 고치는지보다 왜 새는지를 먼저 본다는 진단 원칙.
const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export function CtaBand() {
  return (
    <section className="cta-band" aria-label="상담 안내">
      <div className="inner">
        <div>
          <p className="eyebrow">Repair With Diagnosis</p>
          <h2>
            고치기보다 먼저,
            <br />
            새는 이유를 봅니다.
          </h2>
        </div>
        <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call justify-self-start">
          사진으로 상담하기
        </a>
      </div>
    </section>
  )
}
