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

// 로그인 성공 후(모바일) 1회 호출: 알림 권한 요청 → FCM 토큰 발급 → 서버에 등록(API-408)
export async function registerFcmToken() {
  if (!firebaseConfig.apiKey) return // 실제 Firebase 설정 전이면(dev 등) 조용히 스킵
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const app = initializeApp(firebaseConfig)
  const messaging = getMessaging(app)
  // vite-plugin-pwa 등 다른 서비스워커도 기본 scope('/')를 쓸 수 있는데, 같은 scope에 또 등록하면
  // 나중 등록이 앞의 등록을 덮어씀(scope당 하나만 활성화) — Firebase 공식 가이드대로 별도 scope 사용
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/firebase-cloud-messaging-push-scope',
  })
  const fcmToken = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  if (!fcmToken) return

  await submitFcmToken(fcmToken)
}

export async function submitFcmToken(fcmToken) {
  await httpRequester.patch('/users/me/fcm-token', { fcmToken })
}
