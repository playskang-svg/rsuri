// 진행 과정 레일 — 데스크톱은 가로 1px 레일 위 5열, 모바일은 왼쪽 세로 레일.
// 단계 수는 넘겨받은 배열 길이 그대로(원문 5개). 숫자를 따로 적지 않는다.

export function ProcessRail({ steps, dark = true }: { steps: { title: string; desc: string }[]; dark?: boolean }) {
  return (
    <ol className={`rail ${dark ? '' : 'rail-light'}`} style={{ ['--steps' as string]: steps.length }}>
      <li aria-hidden className="rail-line hidden lg:block" data-reveal="line" />
      {steps.map((s, i) => (
        <li key={s.title} className="rail-step" data-reveal="up" style={{ transitionDelay: `${Math.min(i, 8) * 120}ms` }}>
          <span className="label-mono">{String(i + 1).padStart(2, '0')}</span>
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
        </li>
      ))}
    </ol>
  )
}
