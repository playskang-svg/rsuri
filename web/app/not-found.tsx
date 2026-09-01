export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold text-slate-900">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-slate-600">주소를 다시 확인해 주세요.</p>
      <a href="/" className="mt-6 inline-block text-indigo-600 hover:underline">
        홈으로 돌아가기
      </a>
    </div>
  )
}
