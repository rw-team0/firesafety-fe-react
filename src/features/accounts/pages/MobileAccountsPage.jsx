import { useCallback, useEffect, useRef, useState } from 'react'
import { getManagedUsers } from '../api/accountApi'
import { useSite } from '@/features/sites/useSite'
import EmptyState from '@/shared/components/feedback/EmptyState'
import ErrorState from '@/shared/components/feedback/ErrorState'
import LoadingState from '@/shared/components/feedback/LoadingState'
import Input from '@/shared/components/forms/Input'
import Button from '@/shared/components/buttons/Button'
import BaseModal from '@/shared/components/modals/BaseModal'
import { USER_ROLE_LABELS } from '@/shared/constants/domainLabels'
import { extractErrorMessage } from '@/shared/api/apiError'
import './MobileAccountsPage.css'

// GENERAL(일반직원)만 "직", 나머지(ADMIN/SUPER_ADMIN)는 전부 "관"으로 뭉뚱그려 표시
function getRoleInitial(role) {
  return role === 'GENERAL' ? '직' : '관'
}

// SCR-404-M 직원 연락망 — 등록/수정/삭제 없이 현재 현장 담당자 조회만 한다(PC와 동일한 managed-users API 재사용)
export default function MobileAccountsPage() {
  const { currentSiteId } = useSite()
  const requestSeqRef = useRef(0)

  const [users, setUsers] = useState([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [detailStaff, setDetailStaff] = useState(null)

  const loadUsers = useCallback(async () => {
    const siteId = currentSiteId
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq

    if (!siteId) {
      setUsers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')

    try {
      const data = await getManagedUsers(siteId, { keyword: keyword.trim() || undefined })
      if (requestSeqRef.current !== seq) return
      setUsers(Array.isArray(data?.content) ? data.content : [])
    } catch (error) {
      if (requestSeqRef.current !== seq) return
      setLoadError(extractErrorMessage(error, '직원 연락망을 불러오지 못했습니다.'))
    } finally {
      if (requestSeqRef.current === seq) setLoading(false)
    }
  }, [currentSiteId, keyword])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers()
  }, [loadUsers])

  return (
    <div className="mobile-accounts">
      <h1 className="mobile-accounts__title">직원관리</h1>

      <div className="mobile-accounts__filter">
        <Input
          aria-label="직원 이름 검색"
          placeholder="이름 검색"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState label="직원 연락망을 불러오는 중입니다..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={loadUsers} />
      ) : users.length === 0 ? (
        <EmptyState message="조건에 맞는 직원이 없습니다." />
      ) : (
        <div className="mobile-accounts__list">
          {users.map((staff) => (
            <button key={staff.userId} type="button" className="mobile-accounts__card" onClick={() => setDetailStaff(staff)}>
              <span className="mobile-accounts__avatar">{getRoleInitial(staff.role)}</span>
              <strong className="mobile-accounts__name">{staff.name}</strong>
            </button>
          ))}
        </div>
      )}

      {/* 연락처 상세 — 하단 시트에서 바로 전화/메일 연결 */}
      <BaseModal
        visible={Boolean(detailStaff)}
        onClose={() => setDetailStaff(null)}
        title="직원정보"
        className="modal-panel--narrow"
        footer={
          <Button variant="primary" onClick={() => setDetailStaff(null)}>
            닫기
          </Button>
        }
      >
        {detailStaff && (
          <div className="mobile-accounts__detail">
            <div className="mobile-accounts__detail-row">
              <span className="mobile-accounts__avatar mobile-accounts__avatar--lg">{getRoleInitial(detailStaff.role)}</span>
              <div>
                <strong className="mobile-accounts__detail-name">{detailStaff.name}</strong>
                <span className="mobile-accounts__detail-role">{USER_ROLE_LABELS[detailStaff.role] ?? detailStaff.role}</span>
              </div>
            </div>

            {detailStaff.phone && (
              <a className="mobile-accounts__detail-link" href={`tel:${detailStaff.phone}`}>
                📞 {detailStaff.phone}
              </a>
            )}
            {detailStaff.email && (
              <a className="mobile-accounts__detail-link" href={`mailto:${detailStaff.email}`}>
                ✉️ {detailStaff.email}
              </a>
            )}
          </div>
        )}
      </BaseModal>
    </div>
  )
}
