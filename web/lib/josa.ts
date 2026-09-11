// 한국어 조사 붙이기. 키워드 이름이 50종이라 "계단복원가"처럼 받침에 안 맞는 조사가 섞인다.
// 마지막 글자에 받침이 있으면 앞의 것(은·이·을·과), 없으면 뒤의 것(는·가·를·와).
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return word + withoutBatchim
  return word + (code % 28 === 0 ? withoutBatchim : withBatchim)
}
