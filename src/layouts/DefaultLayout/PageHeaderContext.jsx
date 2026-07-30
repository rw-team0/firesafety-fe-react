import { useState } from 'react'
import { PageHeaderContext } from './pageHeaderContextObject'

// DefaultLayout 헤더의 "페이지별 액션 버튼" 슬롯 — 화면이 usePageActions()로 등록하면 헤더 우측에 렌더된다
export function PageHeaderProvider({ children }) {
  const [actions, setActions] = useState(null)
  return (
    <PageHeaderContext.Provider value={{ actions, setActions }}>{children}</PageHeaderContext.Provider>
  )
}
