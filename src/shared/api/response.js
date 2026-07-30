// 성공 응답에서 resultData만 추출
export function unwrap(axiosResponse) {
  return axiosResponse.data?.resultData
}
