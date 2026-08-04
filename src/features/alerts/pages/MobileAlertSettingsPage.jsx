import { useState } from 'react'
import {
  disablePushNotifications,
  enablePushNotifications,
  isFcmSupported,
  isPushRegisteredLocally,
} from '@/features/auth/utils/fcm'
import { isInAppAlertsMuted, setInAppAlertsMuted } from '@/shared/utils/notificationPrefs'
import './MobileAlertSettingsPage.css'

function hasGrantedNotificationPermission() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

// 로컬 플래그 + 실제 브라우저 권한 둘 다 맞아야 "켜짐"으로 본다 — 권한이 나중에 회수되면 자동으로 꺼진 것처럼 보이게
function resolvePushEnabled() {
  return isFcmSupported() && hasGrantedNotificationPermission() && isPushRegisteredLocally()
}

// SCR-301-M 알림 설정 — 인앱(로컬 뮤트, 서버 계약 없음)과 푸시(FCM 등록/해제, API-408) 두 토글만 다룬다
export default function MobileAlertSettingsPage() {
  const [inAppEnabled, setInAppEnabled] = useState(() => !isInAppAlertsMuted())
  const [pushEnabled, setPushEnabled] = useState(resolvePushEnabled)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState('')

  function handleToggleInApp() {
    const next = !inAppEnabled
    setInAppAlertsMuted(!next)
    setInAppEnabled(next)
  }

  async function handleTogglePush() {
    if (!isFcmSupported() || pushBusy) return
    setPushBusy(true)
    setPushMessage('')

    try {
      if (pushEnabled) {
        await disablePushNotifications()
        setPushEnabled(false)
      } else {
        const result = await enablePushNotifications()
        if (result.ok) {
          setPushEnabled(true)
        } else if (result.reason === 'permission-denied') {
          setPushMessage('브라우저 알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.')
        } else {
          setPushMessage('푸시 알림 등록 중 오류가 발생했습니다.')
        }
      }
    } catch {
      setPushMessage('푸시 알림 설정 중 오류가 발생했습니다.')
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <div className="mobile-alert-settings">
      <h1 className="mobile-alert-settings__title">알림 설정</h1>

      <section className="mobile-alert-settings__row">
        <div className="mobile-alert-settings__copy">
          <span className="mobile-alert-settings__name">인앱 알림</span>
          <span className="mobile-alert-settings__desc">앱 안에서 위험 알림 팝업과 경보음을 받습니다.</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={inAppEnabled}
          className={`mobile-alert-settings__toggle ${inAppEnabled ? 'is-on' : ''}`.trim()}
          onClick={handleToggleInApp}
        >
          <span className="mobile-alert-settings__toggle-thumb" />
        </button>
      </section>

      <section className="mobile-alert-settings__row">
        <div className="mobile-alert-settings__copy">
          <span className="mobile-alert-settings__name">푸시 알림</span>
          <span className="mobile-alert-settings__desc">앱 밖에서도 알림을 받습니다.</span>
          {!isFcmSupported() && (
            <span className="mobile-alert-settings__notice">지원되는 환경에서 사용할 수 있습니다.</span>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={pushEnabled}
          className={`mobile-alert-settings__toggle ${pushEnabled ? 'is-on' : ''}`.trim()}
          disabled={!isFcmSupported() || pushBusy}
          onClick={handleTogglePush}
        >
          <span className="mobile-alert-settings__toggle-thumb" />
        </button>
      </section>

      {pushMessage && <p className="mobile-alert-settings__message">{pushMessage}</p>}
    </div>
  )
}
