import { useContext, useEffect } from 'react'
import { PageHeaderContext } from './pageHeaderContextObject'

function usePageHeaderContext() {
  const ctx = useContext(PageHeaderContext)
  if (!ctx) throw new Error('usePageActions는 DefaultLayout 안에서만 사용할 수 있습니다.')
  return ctx
}

// 화면에서 호출: usePageActions(<Button>...</Button>) — 언마운트 시 자동으로 비워짐
// actions는 반드시 useMemo로 감싸서 넘길 것 — 매 렌더마다 새 엘리먼트를 넘기면 effect가 계속 재실행된다
export function usePageActions(actions) {
  const { setActions } = usePageHeaderContext()
  useEffect(() => {
    setActions(actions)
    return () => setActions(null)
  }, [actions, setActions])
}

export function usePageHeaderActions() {
  return usePageHeaderContext().actions
}
