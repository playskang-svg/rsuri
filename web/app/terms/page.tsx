import type { Metadata } from 'next'

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export const metadata: Metadata = {
  title: '이용약관 | 수리위키',
  description: '수리위키(suriwiki.com)의 정보와 연결 서비스를 이용할 때 알아 둘 조건입니다.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs font-bold tracking-[0.2em] text-[var(--ink-soft)]">TERMS OF USE</p>
      <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] sm:text-3xl">이용약관</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">시행일: 2026년 9월 17일</p>

      <div className="prose mt-10 space-y-8 text-sm leading-relaxed sm:text-base">
        <p>
          이 약관은 수리위키(suriwiki.com, 이하 &quot;사이트&quot;)가 제공하는 지역별 집수리 정보와 상담 연결
          서비스의 이용 조건을 정합니다. 사이트를 이용하면 이 약관에 동의한 것으로 봅니다.
        </p>

        <section>
          <h2 className="text-lg font-bold">1. 서비스의 성격</h2>
          <p className="mt-2">
            사이트는 지역별로 등록된 시공 마스터의 서비스 항목과 시공 사례를 정리해 보여 주고, 전화·문자·카카오톡
            상담으로 연결하는 정보 제공 플랫폼입니다. <strong>사이트 자신은 시공 계약의 당사자가 아니며</strong>,
            실제 방문·견적·시공은 각 지역에 등록된 마스터가 이용자와 직접 협의해 수행합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">2. 책임의 한계</h2>
          <p className="mt-2">
            사이트에 실린 시공 항목 설명, 사례 사진, 자가진단 안내는 상담 전 참고 정보이며, 최종 시공 범위·비용·
            일정·하자보수 조건은 마스터와 이용자가 현장 확인 후 별도로 정합니다. 사이트는 이 협의와 실제 시공
            결과에 대해 법적 책임을 지지 않습니다. 표시된 시공 사례의 결과가 모든 현장에 동일하게 재현됨을
            보장하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">3. 저작권</h2>
          <p className="mt-2">
            사이트에 실린 글, 시공 전후 사진, 편집 구성, 디자인의 저작권은 수리위키 또는 표시된 저작권자에게
            있습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>출처(사이트 이름과 페이지 주소)를 밝히고 링크하는 인용은 자유롭게 할 수 있습니다.</li>
            <li>사진과 본문 전체를 옮겨 싣거나 고쳐서 다시 배포하는 것, 상업적으로 쓰는 것은 미리 허락을 받아야 합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">4. 외부 연결</h2>
          <p className="mt-2">
            상담은 전화 연결(tel:), 문자, 카카오톡 채널({' '}
            <a className="underline" href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
              pf.kakao.com
            </a>
            )로 이뤄집니다. 이들 외부 서비스의 내용과 개인정보 처리는 그 서비스의 방침을 따릅니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">5. 금지 행위</h2>
          <p className="mt-2">
            사이트의 정상적인 운영을 방해하는 행위, 자동화된 수단으로 과도하게 접속하는 행위, 사이트나 등록
            마스터의 이름을 사칭하는 행위를 금지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">6. 약관의 변경</h2>
          <p className="mt-2">약관을 바꾸면 이 페이지에 시행일과 함께 알립니다.</p>
          <p className="mt-2">시행일: 2026년 9월 17일</p>
        </section>
      </div>
    </main>
  )
}
