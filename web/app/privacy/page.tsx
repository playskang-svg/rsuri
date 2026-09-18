import type { Metadata } from 'next'

const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_bcVPX'

export const metadata: Metadata = {
  title: '개인정보처리방침 | 수리위키',
  description: '수리위키(suriwiki.com)가 처리하는 개인정보, 쿠키와 광고 관련 안내입니다.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs font-bold tracking-[0.2em] text-[var(--ink-soft)]">PRIVACY POLICY</p>
      <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] sm:text-3xl">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">시행일: 2026년 9월 17일</p>

      <div className="prose mt-10 space-y-8 text-sm leading-relaxed sm:text-base">
        <p>
          수리위키(suriwiki.com, 이하 &quot;사이트&quot;)는 이용자의 개인정보를 소중히 다루며 「개인정보 보호법」을 지킵니다.
          이 방침은 2026년 9월 17일부터 적용합니다.
        </p>

        <section>
          <h2 className="text-lg font-bold">1. 수집하는 개인정보와 목적</h2>
          <p className="mt-2">
            사이트는 회원가입, 로그인 기능을 두지 않아 방문만으로 이름이나 연락처를 수집하지 않습니다.
            시공 상담은 전화(tel: 연결), 문자, 또는 카카오톡 채널을 통해 이용자가 직접 시작하며, 이 과정에서
            오가는 이름·연락처·사진은 통신사 문자 시스템이나 카카오의 시스템에 남을 뿐 사이트 서버에는 저장되지
            않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">2. 자동으로 생성되는 정보</h2>
          <p className="mt-2">
            사이트를 열면 브라우저가 서버와 외부 서비스에 접속 기록(IP 주소, 브라우저 종류, 방문 일시 등)을
            보냅니다. 사이트는 이 기록으로 이용자를 개인적으로 식별하지 않습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>호스팅</strong> — 사이트는 Cloudflare를 통해 제공되며, 서비스 운영과 보안을 위해 접속 기록이 처리될 수 있습니다.</li>
            <li><strong>글꼴</strong> — Google Fonts에서 글꼴을 불러오며, 이 과정에서 Google에 IP 주소 등 접속 정보가 전달됩니다.</li>
            <li><strong>콘텐츠 데이터</strong> — 지역·시공 항목 정보는 사이트 데이터베이스(Supabase)에서 관리하며, 이용자 개인정보는 포함하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">3. 쿠키와 광고</h2>
          <p className="mt-2">
            사이트는 이용자를 식별하는 자체 쿠키를 쓰지 않습니다. 사이트는 Google 애드센스를 통해 광고를
            게재하며, 광고와 관련해 다음이 적용됩니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Google을 포함한 제3자 광고 사업자는 쿠키를 사용해 이용자가 이 사이트나 다른 사이트를 방문한 기록을 바탕으로 광고를 게재합니다.</li>
            <li>
              Google을 포함한 제3자 광고 사업자는 광고 쿠키, 기기 식별자 등 기술을 사용해 이용자의 관심사에 맞춘
              광고를 보여 줄 수 있습니다. Google이 파트너 사이트에서 얻은 정보를 쓰는 방식은{' '}
              <a className="underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
                Google 개인정보처리방침 · 파트너 사이트 정보 사용
              </a>
              에서 확인할 수 있습니다.
            </li>
            <li>
              이용자는{' '}
              <a className="underline" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
                Google 광고 설정
              </a>
              에서 맞춤 광고를 끌 수 있고,{' '}
              <a className="underline" href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer">
                www.aboutads.info
              </a>
              에서 제3자 사업자의 맞춤 광고 쿠키를 거부할 수 있습니다.
            </li>
            <li>브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 거부해도 사이트의 정보는 모두 볼 수 있습니다.</li>
            <li>광고는 본문과 구분되는 자리에 두며, 광고주는 콘텐츠의 주제와 내용에 관여하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">4. 제3자 제공과 처리 위탁</h2>
          <p className="mt-2">
            사이트는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 법령에 따라 수사기관 등이 적법한 절차로
            요구하는 경우는 예외입니다. 전화·문자·카카오톡으로 이뤄지는 상담은 각 서비스(통신사, 카카오)의
            시스템에 남으며, 사이트가 그 내용을 별도로 수집·보관하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">5. 이용자의 권리</h2>
          <p className="mt-2">
            이용자는 사이트 운영과 관련해 궁금한 점이나 정정·삭제 요청이 있으면 아래{' '}
            <a className="underline" href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
              카카오톡 채널
            </a>
            로 문의할 수 있으며, 확인 뒤 지체 없이 처리합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">6. 안전성 확보 조치</h2>
          <p className="mt-2">사이트는 HTTPS로만 제공합니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold">7. 개인정보 보호책임자</h2>
          <p className="mt-2">
            담당: 수리위키 운영팀
            <br />
            연락처:{' '}
            <a className="underline" href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
              카카오톡 채널
            </a>
          </p>
          <p className="mt-2">
            개인정보 침해에 대한 신고나 상담은 개인정보침해신고센터(국번 없이 118, privacy.kisa.or.kr),
            개인정보분쟁조정위원회(1833-6972, www.kopico.go.kr)에도 할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">8. 방침의 변경</h2>
          <p className="mt-2">이 방침을 바꾸면 시행 7일 전부터 이 페이지에 알립니다.</p>
          <p className="mt-2">시행일: 2026년 9월 17일</p>
        </section>
      </div>
    </main>
  )
}
