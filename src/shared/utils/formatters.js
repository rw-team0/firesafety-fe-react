// 서버 문자열 'T'만 공백 치환, 타임존 재변환 안 함
export function formatDateTime(value) {
  return value ? value.replace('T', ' ') : '-'
}

// Date → 'YYYY-MM-DD'
export function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

// 현재/지정 시각 → 'YYYY-MM-DD HH:mm:ss'
export function formatResultDateTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0') // 한 자리 → 두 자리 패딩
  const y = date.getFullYear()
  const mo = pad(date.getMonth() + 1) // getMonth() 0-base 보정
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const mi = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`
}
