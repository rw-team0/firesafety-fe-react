import { useEffect, useState } from 'react'
import { setLoggingOut } from '@/shared/api/httpRequester'
import * as authApi from './api/authApi'
import { AuthContext } from './authContextObject'
import { clearUser, getUser, setUser, subscribeUser } from './authSession'

// authSession(모듈 SSOT)을 구독해서 React 트리에 값 전달하는 어댑터.
// 사용자 정보의 최종 기준은 authSession 하나뿐 — 여기서 별도로 값을 들고 있지 않고 구독만 한다.
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser())
  // sessionStorage 읽기는 authSession 모듈 로드 시점에 이미 동기 완료됨 — 이 Phase엔 "me" API가 없어
  // 별도 비동기 복구 단계가 없다(그래서 항상 false로 시작). 나중에 서버 검증 단계가 생기면 여기서 true로
  // 바꾸는 지점이 된다.
  const [isInitializing] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => subscribeUser(setUserState), []) // authSession 변경 시(재발급 실패로 인한 clearUser 포함) 리렌더 트리거

  // 로그인 성공 시 setUser()가 authSession→구독자 전체에 알림 → user state 자동 갱신
  async function login(email, password) {
    setLoggingOut(false) // 로그아웃 가드 해제는 반드시 로그인 시작 시점에 (logout 끝에서 하면 401 오탐 재발)
    setIsLoggingIn(true)
    try {
      const profile = await authApi.login(email, password)
      setUser(profile)
      return profile
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function logout() {
    setLoggingOut(true) // 로그아웃 중 뒤늦게 오는 401은 인터셉터가 무시하도록
    setIsLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // 멱등 처리 — 이미 만료된 세션이어도 실패로 취급하지 않음
    } finally {
      clearUser() // authSession 정리 → 구독 중인 Context도 동시에 정리됨
      setIsLoggingOut(false)
      // setLoggingOut(false)는 여기서 호출하지 않는다 — 다음 login() 시작 시점에 해제
    }
  }

  const value = {
    user,
    role: user?.role ?? null,
    isAuthenticated: Boolean(user),
    isInitializing,
    isLoggingIn,
    isLoggingOut,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
