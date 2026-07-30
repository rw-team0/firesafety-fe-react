// 응답 포장: { resultMessage, resultData }, 실패 시 resultData는 null

// 에러 메시지 추출, 없으면 fallback
export function extractErrorMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  const data = error?.response?.data
  return data?.resultMessage ?? fallback
}

// response 없음 → 네트워크 오류
export function isNetworkError(error) {
  return !error?.response
}

// blob 에러 body → 텍스트 변환 후 JSON 재파싱
export async function parseBlobErrorBody(blob) {
  try {
    const text = await blob.text()
    return JSON.parse(text)
  } catch {
    return {} // 파싱 실패 시 빈 객체 대체
  }
}
