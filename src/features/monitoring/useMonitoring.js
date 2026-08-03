import { useContext } from 'react'
import { MonitoringContext } from './monitoringContextObject'

export function useMonitoring() {
  const context = useContext(MonitoringContext)
  if (!context) throw new Error('useMonitoring은 MonitoringProvider 안에서만 사용할 수 있습니다.')
  return context
}
