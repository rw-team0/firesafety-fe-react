import { useContext } from 'react'
import { SiteContext } from './siteContextObject'

export function useSite() {
  const context = useContext(SiteContext)
  if (!context) throw new Error('useSite는 SiteProvider 안에서만 사용할 수 있습니다.')
  return context
}
