// 모든 페이지의 푸터 위에 붙는 어두운 상담 띠. 참고 스킨의 "짐의 양보다 먼저, 두 공간의 조건을 봅니다."
// 자리를 수리위키 말로 바꿨다 — 교체보다 보수·복원이 되는지를 먼저 본다는 원칙.
// (2026-09-11 키워드를 문·문틀·문지방·필름·계단·마루·도배로 좁히면서 누수 중심 문구에서 바꿨다.)
const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export function CtaBand() {
  return (
    <section className="cta-band" aria-label="상담 안내">
      <div className="inner">
        <div>
          <p className="eyebrow">Repair With Diagnosis</p>
          <h2>
            바꾸기 전에,
            <br />
            고칠 수 있는지 봅니다.
          </h2>
        </div>
        <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-call justify-self-start">
          사진으로 상담하기
        </a>
      </div>
    </section>
  )
}
