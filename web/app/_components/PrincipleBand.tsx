// 원칙 띠 — 번호 + 체크 사각 + 세리프 한 문장. 문장은 page.tsx가 원문 상수로 넘긴다.
// 여기 적는 말은 키워드 콘텐츠에 이미 있는 약속만이다(새 약속을 지어내지 않는다).

export function PrincipleBand({ items }: { items: { num: string; text: string }[] }) {
  return (
    <section className="wrap" aria-label="수리위키 원칙">
      <div className="principles" data-reveal="stagger" style={{ ['--stagger' as string]: '100ms' }}>
        {items.map((it, i) => (
          <div key={it.num} style={{ ['--i' as string]: i }}>
            <span className="label-mono">
              <span className="tick" aria-hidden />
              {it.num}
            </span>
            <p>{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
