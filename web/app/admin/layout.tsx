import type { Metadata } from 'next'

// 관리 페이지는 검색엔진에 노출하지 않는다
export const metadata: Metadata = { title: '조합 관리 | 수리위키', robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
