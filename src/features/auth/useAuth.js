import { useContext } from 'react'
import { AuthContext } from './authContextObject'

// AuthProvider 밖에서 호출 시 즉시 에러 (조용히 null 반환 방지)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.')
  return context
}
