import { useEffect, useState } from 'react'
import { getAiModelInfo } from '../api/diagnosisApi'
import { extractServerMessage } from '../utils/facilityFormatters'
import Button from '@/shared/components/buttons/Button'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import BaseModal from '@/shared/components/modals/BaseModal'

function formatPercent(value) {
  return value == null ? '-' : `${(value * 100).toFixed(1)}%`
}

// AI 모델 메타정보(실제 LOLO 평가 지표) — 회로별 데이터가 아니라 모델 전역 정보라 별도 모달로 한 번만 보여준다
export default function AiModelInfoModal({ visible, onClose }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setLoadError('')
    getAiModelInfo()
      .then(setInfo)
      .catch((error) => setLoadError(extractServerMessage(error, 'AI 모델 정보를 불러오지 못했습니다.')))
      .finally(() => setLoading(false))
  }, [visible])

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      title="AI 모델 정보"
      className="facility-modal"
      footer={
        <Button variant="secondary" onClick={onClose}>
          닫기
        </Button>
      }
    >
      {loading ? (
        <LoadingState label="모델 정보를 불러오는 중입니다..." />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : (
        info && (
          <div className="facility-modal__grid">
            <div>
              <span className="facility-modal__grid-label">F1 스코어</span>
              <p className="facility-modal__grid-value">{formatPercent(info.loloF1)}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">Precision</span>
              <p className="facility-modal__grid-value">{formatPercent(info.loloPrecision)}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">Recall</span>
              <p className="facility-modal__grid-value">{formatPercent(info.loloRecall)}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">평가 윈도우 수</span>
              <p className="facility-modal__grid-value">{info.nWindows ?? '-'}건</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">scikit-learn 버전</span>
              <p className="facility-modal__grid-value">{info.sklearnVersion ?? '-'}</p>
            </div>
            <div>
              <span className="facility-modal__grid-label">판정 기준값(threshold)</span>
              <p className="facility-modal__grid-value">{info.threshold ?? '-'}</p>
            </div>
            <div className="facility-modal__grid-full">
              <span className="facility-modal__grid-label">학습에 사용된 부하 종류</span>
              <p className="facility-modal__grid-value">{info.loads?.join(', ') || '-'}</p>
            </div>
            <div className="facility-modal__grid-full">
              <span className="facility-modal__grid-label">참고</span>
              <p className="facility-modal__grid-value">
                위 수치는 학습 시점에 부하 종류를 하나씩 빼고 평가한(Leave-One-Load-Out) 실측 성능이며, 실시간
                누적 집계가 아닙니다.
              </p>
            </div>
          </div>
        )
      )}
    </BaseModal>
  )
}
