'use client'

import { useEffect } from 'react'
import { getActivityTracker } from '@/lib/analytics/activity-tracker'

interface ActivityTrackerProviderProps {
  children: React.ReactNode
}

export function ActivityTrackerProvider({ children }: ActivityTrackerProviderProps) {
  useEffect(() => {
    // アクティビティトラッカーを初期化
    const tracker = getActivityTracker()
    
    // 未送信データの同期
    tracker?.syncPendingActivities()
    
    // 定期的に未送信データを同期（5分間隔）
    const syncInterval = setInterval(() => {
      tracker?.syncPendingActivities()
    }, 5 * 60 * 1000)
    
    return () => {
      clearInterval(syncInterval)
    }
  }, [])
  
  return <>{children}</>
}