import { initializeApp } from 'firebase/app'
import { getMessaging, getToken } from 'firebase/messaging'
import httpRequester from '@/shared/api/httpRequester'

// FCM 웹푸시는 모바일 PWA 전용(NFR-11) — VITE_FIREBASE_* 값은 .env.production에 실제 설정값으로 채워져 있음
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// 알림 설정 화면에서 "이 기기의 등록 여부"를 보여주기 위한 로컬 표시값일 뿐 SSOT는 서버(user_fcm_token)다.
// 로그인/기기가 바뀌면 틀릴 수 있지만, 진위는 매번 서버 재등록/해제 API 성공 여부로만 확정한다.
const PUSH_REGISTERED_KEY = 'fcmPushRegistered'

export function isFcmSupported() {
  return Boolean(firebaseConfig.apiKey) && 'Notification' in window && 'serviceWorker' in navigator
}

export function isPushRegisteredLocally() {
  return localStorage.getItem(PUSH_REGISTERED_KEY) === '1'
}

function setPushRegisteredLocally(registered) {
  if (registered) localStorage.setItem(PUSH_REGISTERED_KEY, '1')
  else localStorage.removeItem(PUSH_REGISTERED_KEY)
}

// Firebase 앱/메시징/서비스워커 등록 + 토큰 발급까지의 공통 절차 — register/deregister가 동일 토큰을 얻을 때 재사용
async function resolveMessagingToken() {
  const app = initializeApp(firebaseConfig)
  const messaging = getMessaging(app)
  // vite-plugin-pwa 등 다른 서비스워커도 기본 scope('/')를 쓸 수 있는데, 같은 scope에 또 등록하면
  // 나중 등록이 앞의 등록을 덮어씀(scope당 하나만 활성화) — Firebase 공식 가이드대로 별도 scope 사용
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/firebase-cloud-messaging-push-scope',
  })
  return getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
}

// 로그인 성공 후(모바일) 1회 호출: 알림 권한 요청 → FCM 토큰 발급 → 서버에 등록(API-408)
export async function registerFcmToken() {
  if (!isFcmSupported()) return // 실제 Firebase 설정 전이면(dev 등) 조용히 스킵

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const fcmToken = await resolveMessagingToken()
  if (!fcmToken) return

  await submitFcmToken(fcmToken)
  setPushRegisteredLocally(true)
}

export async function submitFcmToken(fcmToken) {
  await httpRequester.patch('/users/me/fcm-token', { fcmToken })
}

// 알림 설정 화면의 "푸시 알림" 토글 ON — 권한요청부터 서버 등록까지, 실패 사유를 화면에서 구분할 수 있게 결과를 반환한다
export async function enablePushNotifications() {
  if (!isFcmSupported()) return { ok: false, reason: 'unsupported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'permission-denied' }

  const fcmToken = await resolveMessagingToken()
  if (!fcmToken) return { ok: false, reason: 'token-failed' }

  await submitFcmToken(fcmToken)
  setPushRegisteredLocally(true)
  return { ok: true }
}

// 알림 설정 화면의 "푸시 알림" 토글 OFF — 같은 기기/서비스워커면 Firebase가 캐시된 동일 토큰을 돌려주므로 그 값으로 서버 등록을 해제한다
export async function disablePushNotifications() {
  if (!isFcmSupported()) {
    setPushRegisteredLocally(false)
    return { ok: true }
  }

  try {
    const fcmToken = await resolveMessagingToken()
    if (fcmToken) await httpRequester.delete('/users/me/fcm-token', { data: { fcmToken } })
  } finally {
    // 서버 삭제가 실패해도(이미 만료된 토큰 등) 이 기기에서는 껐다고 보여준다 — 다음 로그인 때 재등록하면 다시 맞춰짐
    setPushRegisteredLocally(false)
  }
  return { ok: true }
}
