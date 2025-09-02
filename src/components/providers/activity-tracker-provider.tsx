'use client'

import { useEffect } from 'react'
import { getActivityTracker } from '@/lib/analytics/activity-tracker'

interface ActivityTrackerProviderProps {
  children: React.ReactNode
}

export function ActivityTrackerProvider({ children }: ActivityTrackerProviderProps) {
  useEffect(() => {
    // 本番環境では一時的に無効化（パフォーマンス改善のため）
    if (process.env.NODE_ENV === 'production') {
      return
    }
    
    // 開発環境のみでアクティビティトラッカーを初期化
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