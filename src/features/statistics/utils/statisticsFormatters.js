// 서버 응답 [{key,label,count}] 목록에서 특정 key의 count만 뽑기
export function countOf(counts, key) {
  return counts?.find((item) => item.key === key)?.count ?? 0
}

// 여러 key의 count 합산 (예: 미처리 경보 = UNCONFIRMED + CONFIRMED)
export function sumCounts(counts, keys) {
  return keys.reduce((sum, key) => sum + countOf(counts, key), 0)
}

// 0건일 때 나눗셈 방지 — 비율(%) 계산
export function percentOf(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}
