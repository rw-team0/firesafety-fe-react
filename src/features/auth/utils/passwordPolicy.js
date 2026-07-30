// 백엔드 CredentialPolicy.PASSWORD_PATTERN과 동일 정규식 — 클라이언트 검증 메시지도 서버 메시지 그대로 사용
// (공백 없이 영문+숫자 포함, 8~30자)
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)\S{8,30}$/

export const PASSWORD_POLICY_MESSAGE = '비밀번호는 공백 없이 영문과 숫자를 포함하여 8자 이상 입력해 주세요'

export function isValidPassword(password) {
  return PASSWORD_PATTERN.test(password)
}
