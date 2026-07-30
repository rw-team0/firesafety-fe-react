import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

// ESC 닫기 + Tab 포커스 트랩 + 닫힐 때 이전 포커스 복원
export function useModalA11y({ visible, onClose }) {
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!visible) return undefined // 비표시 상태면 리스너 등록 불필요

    previousFocusRef.current = document.activeElement // 닫을 때 복원할 포커스 기억
    const panel = panelRef.current
    const focusables = panel ? panel.querySelectorAll(FOCUSABLE_SELECTOR) : []
    focusables[0]?.focus() // 열리자마자 첫 포커스 가능 요소로 이동

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        onClose?.()
        return
      }
      if (event.key !== 'Tab' || focusables.length === 0) return

      // 첫/마지막 요소에서 Tab 순환 → 모달 밖으로 포커스 못 나가게
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
      previousFocusRef.current?.focus?.() // 닫힐 때 원래 포커스로 복귀
    }
  }, [visible, onClose])

  return panelRef
}
