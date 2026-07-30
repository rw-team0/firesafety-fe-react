import { useState } from 'react'
import ActionResultModal from '../shared/components/modals/ActionResultModal'
import BaseCard from '../shared/components/data-display/BaseCard'
import BaseModal from '../shared/components/modals/BaseModal'
import Button from '../shared/components/buttons/Button'
import Checkbox from '../shared/components/forms/Checkbox'
import ConfirmModal from '../shared/components/modals/ConfirmModal'
import DataTable from '../shared/components/data-display/DataTable'
import EmptyState from '../shared/components/feedback/EmptyState'
import ErrorState from '../shared/components/feedback/ErrorState'
import FilterBar from '../shared/components/layout/FilterBar'
import Input from '../shared/components/forms/Input'
import LoadingState from '../shared/components/feedback/LoadingState'
import Pagination from '../shared/components/data-display/Pagination'
import PageHeader from '../shared/components/layout/PageHeader'
import Select from '../shared/components/forms/Select'
import StatusBadge from '../shared/components/feedback/StatusBadge'
import Textarea from '../shared/components/forms/Textarea'

const TOKEN_COLORS = [
  '--color-brand',
  '--color-sidebar-bg',
  '--color-success',
  '--color-warning',
  '--color-danger',
  '--color-offline',
]

const STATUS_VALUES = ['NORMAL', 'CAUTION', 'RISK', 'OFFLINE', 'UNCONFIRMED', 'CONFIRMED', 'RESOLVED']

const SAMPLE_ROWS = [
  { id: 1, name: '1현장 분전반 A', status: 'NORMAL' },
  { id: 2, name: '2현장 분전반 B', status: 'RISK' },
]

// 개발 전용 컴포넌트 카탈로그, production 빌드엔 라우트 자체가 없음(app/router.jsx)
export default function DesignSystemPage() {
  const [page, setPage] = useState(1)
  const [baseModalOpen, setBaseModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)

  return (
    <div className="u-flex-col u-gap-16" style={{ padding: 'var(--space-24)', maxWidth: 960 }}>
      <PageHeader title="디자인 시스템" subtitle="/dev/design-system — 개발 전용" />

      <BaseCard header={<h2>색상 토큰</h2>}>
        <div className="u-flex u-gap-16" style={{ flexWrap: 'wrap' }}>
          {TOKEN_COLORS.map((token) => (
            <div key={token} className="u-flex-col u-gap-8" style={{ width: 120 }}>
              <div
                style={{
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: `var(${token})`,
                  border: '1px solid var(--color-border)',
                }}
              />
              <code style={{ fontSize: 'var(--font-size-caption)' }}>{token}</code>
            </div>
          ))}
        </div>
      </BaseCard>

      <BaseCard header={<h2>Typography</h2>}>
        <p style={{ fontSize: 'var(--font-size-title)' }}>Title 22px</p>
        <p style={{ fontSize: 'var(--font-size-subtitle)' }}>Subtitle 16px</p>
        <p style={{ fontSize: 'var(--font-size-body)' }}>Body 14px</p>
        <p style={{ fontSize: 'var(--font-size-caption)' }}>Caption 12px</p>
      </BaseCard>

      <BaseCard header={<h2>Button</h2>}>
        <div className="u-flex u-gap-8">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </BaseCard>

      <BaseCard header={<h2>Form 요소</h2>}>
        <div className="u-flex-col u-gap-12" style={{ maxWidth: 320 }}>
          <Input label="현장명" placeholder="현장명을 입력하세요" />
          <Select
            label="상태"
            placeholder="선택"
            options={STATUS_VALUES.map((value) => ({ value, label: value }))}
          />
          <Checkbox label="미확인 알림만 보기" />
          <Textarea label="비고" placeholder="특이사항" />
          <Input label="에러 예시" error="필수 입력값입니다." />
        </div>
      </BaseCard>

      <BaseCard header={<h2>StatusBadge</h2>}>
        <div className="u-flex u-gap-8" style={{ flexWrap: 'wrap' }}>
          {STATUS_VALUES.map((status) => (
            <StatusBadge key={status} status={status} label={status} />
          ))}
        </div>
      </BaseCard>

      <BaseCard header={<h2>Pagination</h2>}>
        <Pagination page={page} totalPages={25} onChange={setPage} />
      </BaseCard>

      <BaseCard header={<h2>Loading / Empty / Error</h2>}>
        <div className="u-flex-col u-gap-12">
          <LoadingState />
          <EmptyState />
          <ErrorState onRetry={() => {}} />
        </div>
      </BaseCard>

      <BaseCard header={<h2>FilterBar / DataTable</h2>}>
        <FilterBar
          actions={
            <Button variant="primary" onClick={() => {}}>
              조회
            </Button>
          }
        >
          <Input placeholder="검색어" />
          <Select placeholder="상태 전체" options={STATUS_VALUES.map((value) => ({ value, label: value }))} />
        </FilterBar>
        <DataTable
          columns={[
            { key: 'name', header: '이름' },
            { key: 'status', header: '상태', render: (row) => <StatusBadge status={row.status} label={row.status} /> },
          ]}
          rows={SAMPLE_ROWS}
          rowKey={(row) => row.id}
        />
      </BaseCard>

      <BaseCard header={<h2>Modal</h2>}>
        <div className="u-flex u-gap-8">
          <Button onClick={() => setBaseModalOpen(true)}>BaseModal 열기</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            ConfirmModal 열기
          </Button>
          <Button variant="secondary" onClick={() => setResultOpen(true)}>
            ActionResultModal 열기
          </Button>
        </div>
      </BaseCard>

      <BaseModal visible={baseModalOpen} onClose={() => setBaseModalOpen(false)} title="BaseModal 예시">
        <p>모달 본문 영역입니다. ESC 또는 배경 클릭으로 닫힙니다.</p>
      </BaseModal>

      <ConfirmModal
        visible={confirmOpen}
        title="분전반을 삭제하시겠습니까?"
        message="삭제된 분전반은 복구가 불가합니다."
        danger
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      >
        <div className="card u-text-secondary" style={{ fontSize: 'var(--font-size-caption)' }}>
          1현장 분전반 A · 회로 4개
        </div>
      </ConfirmModal>

      <ActionResultModal
        visible={resultOpen}
        type="success"
        title="AI 진단 실행이 완료되었습니다"
        subtitle="회로 3번 진단 결과가 등록되었습니다"
        infoRows={[
          { label: '진단 대상', value: '1현장 분전반 A · 회로 3' },
          { label: '처리 시각', value: '2026-07-30 09:30' },
          { label: '처리자', value: '관리사무소' },
        ]}
        onClose={() => setResultOpen(false)}
      />
    </div>
  )
}
