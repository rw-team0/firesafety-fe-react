import Button from '../buttons/Button'

// 요청 실패 공통 배너. onRetry 넘기면 재시도 버튼 노출
export default function ErrorState({ message = '문제가 발생했습니다. 잠시 후 다시 시도해주세요.', onRetry }) {
  return (
    <div className="banner banner-danger u-flex u-items-center u-justify-between">
      <span>{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}
