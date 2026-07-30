import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '@/layouts/AuthLayout'
import DefaultLayout from '@/layouts/DefaultLayout/DefaultLayout'
import MobileLayout from '@/layouts/MobileLayout/MobileLayout'
import LoadingState from '@/shared/components/feedback/LoadingState'
import NotFoundPage from '../pages/NotFoundPage'
import PlaceholderPage from '../pages/PlaceholderPage'
import ProtectedRoute from './ProtectedRoute'
import RoleRoute from './RoleRoute'
import { routeConfig } from './routeConfig'

const DesignSystemPage = lazy(() => import('@/dev/DesignSystemPage')) // 개발 전용, 아래 조건부 라우트에서만 로드

const LAYOUTS = {
  auth: AuthLayout,
  'mobile-auth': AuthLayout,
  default: DefaultLayout,
  mobile: MobileLayout,
}

// requiredRole 있으면 로그인+권한 가드로 감싸기, 없으면 그대로 통과
function guard(route, element) {
  if (!route.requiredRole) return element
  return (
    <ProtectedRoute>
      <RoleRoute requiredRole={route.requiredRole}>{element}</RoleRoute>
    </ProtectedRoute>
  )
}

// layout별로 라우트 묶기 → <Layout><Outlet/></Layout> 중첩 라우트 구성용
function groupByLayout() {
  const groups = new Map()
  routeConfig.forEach((route) => {
    if (!groups.has(route.layout)) groups.set(route.layout, [])
    groups.get(route.layout).push(route)
  })
  return groups
}

export default function AppRouter() {
  const groups = groupByLayout()

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {Array.from(groups.entries()).map(([layoutKey, routes]) => {
        const Layout = LAYOUTS[layoutKey]
        return (
          <Route key={layoutKey} element={<Layout />}>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={guard(route, <PlaceholderPage title={route.title} scrId={route.scrId} />)}
              />
            ))}
          </Route>
        )
      })}

      {/* 개발 전용 디자인 시스템 — production 빌드 시 조건 false → 라우트 자체 미등록 */}
      {import.meta.env.DEV && (
        <Route
          path="/dev/design-system"
          element={
            <Suspense fallback={<LoadingState />}>
              <DesignSystemPage />
            </Suspense>
          }
        />
      )}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
