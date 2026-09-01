import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: '수리위키 - 대한민국 집수리 정보 포털',
  description: '지역별 집수리 시세와 실제 시공 사례를 모은 수리위키',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <Link href="/" className="text-lg font-bold text-slate-900">
              수리위키
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-slate-200 py-8 text-center text-sm text-slate-500">
          <p>수리위키 (SuriWiki) · 대한민국 집수리 정보 포털</p>
        </footer>
      </body>
    </html>
  )
}
