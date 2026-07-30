import { useEffect, useState } from 'react'
import { AuthContext } from './authContextObject'
import { clearUser, getUser, setUser, subscribeUser } from './authSession'

// authSession(모듈 SSOT)을 구독해서 React 트리에 값 전달하는 어댑터
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser())

  useEffect(() => subscribeUser(setUserState), []) // authSession 변경 시 리렌더 트리거

  const value = {
    user,
    isLoggedIn: Boolean(user),
    role: user?.role ?? null,
    setUser,
    clearUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
