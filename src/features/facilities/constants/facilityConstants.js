// 설비관리 정책 상수 SSOT — 화면 파일에 매직넘버를 직접 반복하지 않는다.
// 값 근거: 03-테이블명세.md(panel/circuit 컬럼 제약), 02-API명세.md(API-507/508/510)

export const MIN_CIRCUIT_COUNT = 1
export const MAX_CIRCUIT_COUNT = 10
export const MAX_CIRCUIT_CHANNEL = 10 // 채널 슬롯 물리적 상한(circuitCount와 별개로 항상 10)
export const M_NO_LENGTH = 5
export const LOAD_TYPE_MAX_LENGTH = 50

export const EQUIPMENT_LIST_PAGE_SIZE = 11
export const FACILITY_MANAGE_PAGE_SIZE = 8

export const FACILITY_MANAGE_TABS = ['panels', 'circuits']
