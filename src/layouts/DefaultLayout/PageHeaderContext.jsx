import { useState } from 'react'
import { PageHeaderContext } from './pageHeaderContextObject'

// DefaultLayout 헤더의 "페이지별 액션 버튼/부제목" 슬롯 — 화면이 usePageActions()/usePageSubtitle()로 등록하면
// 각각 헤더 우측, 페이지 제목 옆에 렌더된다
export function PageHeaderProvider({ children }) {
  const [actions, setActions] = useState(null)
  const [subtitle, setSubtitle] = useState(null)
  return (
    <PageHeaderContext.Provider value={{ actions, setActions, subtitle, setSubtitle }}>
      {children}
    </PageHeaderContext.Provider>
  )
}
