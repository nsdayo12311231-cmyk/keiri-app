'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Users, Eye, MousePointer, Clock, TrendingUp, Activity, Smartphone, Monitor } from 'lucide-react'

interface AnalyticsData {
  totalUsers: number
  activeUsers: number
  totalPageViews: number
  totalClicks: number
  averageSessionTime: number
  topPages: Array<{ page: string; views: number }>
  userDevices: Array<{ device: string; count: number }>
  hourlyActivity: Array<{ hour: number; activities: number }>
  featureUsage: Array<{ feature: string; usage: number }>
  recentActivities: Array<{
    id: string
    user_id: string
    action_type: string
    page_url: string
    created_at: string
  }>
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h') // 24h, 7d, 30d
  const [autoRefresh, setAutoRefresh] = useState(true)
  

  useEffect(() => {
    // 開発環境では権限チェックを緩和
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (isDevelopment) {
      console.log('開発環境: 管理画面アクセスを許可')
    }
    
    fetchAnalytics()
    
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(fetchAnalytics, 30000) // 30秒間隔で更新
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timeRange, autoRefresh])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // 時間範囲の設定
      const now = new Date()
      let startDate: Date
      
      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      // 並列でデータを取得
      const [
        usersData,
        pageViewsData,
        clicksData,
        sessionsData,
        topPagesData,
        devicesData,
        hourlyData,
        featuresData,
        recentActivitiesData
      ] = await Promise.all([
        // 総ユーザー数・アクティブユーザー数
        supabase
          .from('user_activities')
          .select('user_id')
          .gte('timestamp_utc', startDate.toISOString()),
        
        // ページビュー数
        supabase
          .from('user_activities')
          .select('*')
          .eq('action_type', 'page_visit')
          .gte('timestamp_utc', startDate.toISOString()),
        
        // クリック数
        supabase
          .from('user_activities')
          .select('*')
          .eq('action_type', 'click')
          .gte('timestamp_utc', startDate.toISOString()),
        
        // セッション時間
        supabase
          .from('user_sessions')
          .select('total_duration_ms')
          .gte('started_at', startDate.toISOString()),
        
        // 人気ページ
        supabase
          .from('user_activities')
          .select('page_url')
          .eq('action_type', 'page_visit')
          .gte('timestamp_utc', startDate.toISOString()),
        
        // デバイス別データ
        supabase
          .from('user_sessions')
          .select('device_type')
          .gte('started_at', startDate.toISOString()),
        
        // 時間別アクティビティ
        supabase
          .from('user_activities')
          .select('timestamp_utc')
          .gte('timestamp_utc', startDate.toISOString()),
        
        // 機能使用状況
        supabase
          .from('feature_usage')
          .select('feature_name, usage_count')
          .gte('last_used_at', startDate.toISOString()),
        
        // 最近のアクティビティ
        supabase
          .from('user_activities')
          .select('id, user_id, action_type, page_url, timestamp_utc')
          .order('timestamp_utc', { ascending: false })
          .limit(10)
      ])

      // データを加工
      const uniqueUsers = new Set(usersData.data?.map(d => d.user_id) || []).size
      const totalPageViews = pageViewsData.data?.length || 0
      const totalClicks = clicksData.data?.length || 0
      
      const sessionTimes = sessionsData.data?.map(s => s.total_duration_ms || 0) || []
      const averageSessionTime = sessionTimes.length > 0 
        ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length 
        : 0

      // トップページの集計
      const pageCount: Record<string, number> = {}
      topPagesData.data?.forEach(item => {
        const url = new URL(item.page_url).pathname
        pageCount[url] = (pageCount[url] || 0) + 1
      })
      const topPages = Object.entries(pageCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }))

      // デバイス別の集計
      const deviceCount: Record<string, number> = {}
      devicesData.data?.forEach(item => {
        deviceCount[item.device_type] = (deviceCount[item.device_type] || 0) + 1
      })
      const userDevices = Object.entries(deviceCount)
        .map(([device, count]) => ({ device, count }))

      // 時間別アクティビティ
      const hourlyCount: Record<number, number> = {}
      hourlyData.data?.forEach(item => {
        const hour = new Date(item.timestamp_utc).getHours()
        hourlyCount[hour] = (hourlyCount[hour] || 0) + 1
      })
      const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        activities: hourlyCount[i] || 0
      }))

      // 機能使用状況
      const featureUsage = featuresData.data?.map(item => ({
        feature: item.feature_name,
        usage: item.usage_count
      })) || []

      const analytics: AnalyticsData = {
        totalUsers: uniqueUsers,
        activeUsers: uniqueUsers, // 期間内にアクティビティがあったユーザー
        totalPageViews,
        totalClicks,
        averageSessionTime: Math.round(averageSessionTime / 1000 / 60), // 分単位
        topPages,
        userDevices,
        hourlyActivity,
        featureUsage,
        recentActivities: recentActivitiesData.data?.map(activity => ({
          ...activity,
          created_at: activity.timestamp_utc
        })) || []
      }

      setAnalyticsData(analytics)
      
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分`
    return `${Math.floor(minutes / 60)}時間${minutes % 60}分`
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">分析データを読み込み中...</div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">データの読み込みに失敗しました</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ユーザー行動分析</h1>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">過去24時間</SelectItem>
              <SelectItem value="7d">過去7日</SelectItem>
              <SelectItem value="30d">過去30日</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            {autoRefresh ? '自動更新中' : '手動更新'}
          </Button>
          <Button onClick={fetchAnalytics} size="sm">
            更新
          </Button>
        </div>
      </div>

      {/* 概要メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブユーザー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ページビュー</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalPageViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">クリック数</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalClicks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均セッション時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(analyticsData.averageSessionTime)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">機能使用数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.featureUsage.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* チャートエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 時間別アクティビティ */}
        <Card>
          <CardHeader>
            <CardTitle>時間別アクティビティ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activities" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* デバイス別利用状況 */}
        <Card>
          <CardHeader>
            <CardTitle>デバイス別利用状況</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.userDevices}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ device, count }) => `${device}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.userDevices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 詳細データ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 人気ページ */}
        <Card>
          <CardHeader>
            <CardTitle>人気ページ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analyticsData.topPages.slice(0, 10).map((page, index) => (
                <div key={page.page} className="flex justify-between items-center">
                  <span className="text-sm truncate" title={page.page}>
                    {index + 1}. {page.page}
                  </span>
                  <Badge variant="secondary">{page.views}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最近のアクティビティ */}
        <Card>
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 text-sm">
                  <Badge variant="outline" className="shrink-0">
                    {activity.action_type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{new URL(activity.page_url).pathname}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}