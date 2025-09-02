import { createClient } from '@/lib/supabase/client'

interface ActivityData {
  actionType: string
  pageUrl?: string
  elementSelector?: string
  elementText?: string
  additionalData?: Record<string, any>
  durationMs?: number
}

interface SessionData {
  deviceType: string
  os: string
  browser: string
  screenResolution: string
}

class ActivityTracker {
  private supabase = createClient()
  private sessionId: string
  private pageStartTime: number = Date.now()
  private currentUserId: string | null = null
  private isDebug: boolean = process.env.NODE_ENV === 'development'
  
  constructor() {
    this.sessionId = this.generateSessionId()
    this.log('ActivityTracker initialized with sessionId:', this.sessionId)
    this.setupEventListeners()
    this.initializeSession()
  }
  
  private log(...args: any[]) {
    if (this.isDebug) {
      console.log('[ActivityTracker]', ...args)
    }
  }
  
  private error(...args: any[]) {
    if (this.isDebug) {
      console.error('[ActivityTracker]', ...args)
    }
  }
  
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  private async initializeSession() {
    try {
      this.log('Initializing session...')
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      
      if (authError) {
        this.error('Auth error:', authError)
      }
      
      this.currentUserId = user?.id || null
      this.log('Current user ID:', this.currentUserId)
      
      if (typeof window !== 'undefined') {
        const sessionData: SessionData = {
          deviceType: this.getDeviceType(),
          os: this.getOS(),
          browser: this.getBrowser(),
          screenResolution: `${screen.width}x${screen.height}`
        }
        
        this.log('Session data:', sessionData)
        
        const { error: insertError } = await this.supabase
          .from('user_sessions')
          .insert({
            session_id: this.sessionId,
            user_id: this.currentUserId,
            device_type: sessionData.deviceType,
            os: sessionData.os,
            browser: sessionData.browser,
            ip_address: await this.getIPAddress()
          })
          
        if (insertError) {
          this.error('Failed to insert session:', insertError)
        } else {
          this.log('Session created successfully')
        }
      }
    } catch (error) {
      this.error('Failed to initialize session:', error)
    }
  }
  
  private setupEventListeners() {
    if (typeof window === 'undefined') {
      this.log('Window not available, skipping event listeners')
      return
    }
    
    this.log('Setting up event listeners')
    
    // ページ訪問追跡
    this.trackPageView()
    
    // クリック追跡
    document.addEventListener('click', (event) => {
      this.log('Click detected on:', event.target)
      this.trackClick(event)
    }, { passive: true })
    
    // ページ離脱追跡
    window.addEventListener('beforeunload', () => {
      this.log('Page unload detected')
      this.trackPageLeave()
    })
    
    // フォーカス/ブラー追跡（ページがアクティブかどうか）
    document.addEventListener('visibilitychange', () => {
      this.log('Visibility change:', document.hidden ? 'hidden' : 'visible')
      if (document.hidden) {
        this.trackPageLeave()
      } else {
        this.pageStartTime = Date.now()
        this.trackPageView()
      }
    })
    
    // パフォーマンス測定
    this.trackPerformanceMetrics()
    
    this.log('Event listeners setup complete')
  }
  
  private async trackActivity(data: ActivityData) {
    try {
      const activityData = {
        user_id: this.currentUserId,
        session_id: this.sessionId,
        action_type: data.actionType,
        page_url: data.pageUrl || window.location.href,
        element_selector: data.elementSelector,
        element_text: data.elementText,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        browser_info: {
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          screen: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth
          }
        },
        screen_resolution: `${screen.width}x${screen.height}`,
        duration_ms: data.durationMs,
        additional_data: data.additionalData
      }
      
      this.log('Tracking activity:', data.actionType, activityData)
      
      const { error } = await this.supabase
        .from('user_activities')
        .insert(activityData)
        
      if (error) {
        this.error('Failed to insert activity:', error)
        this.saveToLocalStorage(data)
      } else {
        this.log('Activity tracked successfully:', data.actionType)
      }
        
    } catch (error) {
      this.error('Failed to track activity:', error)
      // フォールバック: LocalStorageに保存
      this.saveToLocalStorage(data)
    }
  }
  
  private trackPageView() {
    this.pageStartTime = Date.now()
    this.trackActivity({
      actionType: 'page_visit',
      additionalData: {
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    })
  }
  
  private trackPageLeave() {
    const duration = Date.now() - this.pageStartTime
    this.trackActivity({
      actionType: 'page_leave',
      durationMs: duration
    })
  }
  
  private trackClick(event: MouseEvent) {
    const target = event.target as Element
    if (!target) return
    
    const selector = this.generateSelector(target)
    const text = target.textContent?.trim() || ''
    
    this.trackActivity({
      actionType: 'click',
      elementSelector: selector,
      elementText: text.substring(0, 100), // 最初の100文字のみ
      additionalData: {
        coordinates: {
          x: event.clientX,
          y: event.clientY
        },
        tagName: target.tagName.toLowerCase(),
        className: target.className
      }
    })
  }
  
  private generateSelector(element: Element): string {
    if (element.id) return `#${element.id}`
    if (element.className) return `.${element.className.split(' ').join('.')}`
    
    let selector = element.tagName.toLowerCase()
    let parent = element.parentElement
    
    while (parent && selector.length < 100) {
      if (parent.id) {
        selector = `#${parent.id} > ${selector}`
        break
      }
      if (parent.className) {
        selector = `.${parent.className.split(' ').join('.')} > ${selector}`
        break
      }
      selector = `${parent.tagName.toLowerCase()} > ${selector}`
      parent = parent.parentElement
    }
    
    return selector
  }
  
  private getDeviceType(): string {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }
  
  private getOS(): string {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    return 'Unknown'
  }
  
  private getBrowser(): string {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Other'
  }
  
  private async getIPAddress(): Promise<string | null> {
    try {
      // IP取得は外部サービスを使用（プライバシー配慮）
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip || null
    } catch {
      return null
    }
  }
  
  private trackPerformanceMetrics() {
    if (typeof window === 'undefined' || !('performance' in window)) return
    
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paintMetrics = performance.getEntriesByType('paint')
        
        const fcp = paintMetrics.find(entry => entry.name === 'first-contentful-paint')
        const lcp = paintMetrics.find(entry => entry.name === 'largest-contentful-paint')
        
        const performanceData = {
          user_id: this.currentUserId,
          session_id: this.sessionId,
          page_url: window.location.href,
          load_time_ms: Math.round(navigation.loadEventEnd - navigation.fetchStart),
          first_contentful_paint_ms: fcp ? Math.round(fcp.startTime) : null,
          largest_contentful_paint_ms: lcp ? Math.round(lcp.startTime) : null,
          navigation_type: navigation.type === 0 ? 'navigate' : navigation.type === 1 ? 'reload' : 'back_forward'
        }
        
        this.supabase
          .from('performance_metrics')
          .insert(performanceData)
          .catch(error => console.error('Failed to track performance:', error))
      }, 1000)
    })
  }
  
  private saveToLocalStorage(data: ActivityData) {
    try {
      const stored = localStorage.getItem('keiri_pending_activities')
      const activities = stored ? JSON.parse(stored) : []
      activities.push({ ...data, timestamp: Date.now() })
      
      if (activities.length > 100) {
        activities.splice(0, activities.length - 100)
      }
      
      localStorage.setItem('keiri_pending_activities', JSON.stringify(activities))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }
  
  // 公開メソッド：カスタムイベント追跡
  async trackFeatureUse(featureName: string, success: boolean = true, duration?: number) {
    await this.trackActivity({
      actionType: 'feature_use',
      additionalData: {
        featureName,
        success,
        duration
      }
    })
    
    // 機能使用統計テーブルも更新
    try {
      await this.supabase.rpc('upsert_feature_usage', {
        p_user_id: this.currentUserId,
        p_feature_name: featureName,
        p_success: success,
        p_duration_ms: duration
      })
    } catch (error) {
      console.error('Failed to update feature usage:', error)
    }
  }
  
  async trackFormSubmit(formName: string, success: boolean = true, errors?: string[]) {
    await this.trackActivity({
      actionType: 'form_submit',
      additionalData: {
        formName,
        success,
        errors
      }
    })
  }
  
  async trackAPICall(endpoint: string, method: string, duration: number, success: boolean) {
    await this.trackActivity({
      actionType: 'api_call',
      additionalData: {
        endpoint,
        method,
        duration,
        success
      }
    })
  }
  
  // 未送信データの同期
  async syncPendingActivities() {
    try {
      const stored = localStorage.getItem('keiri_pending_activities')
      if (!stored) return
      
      const activities = JSON.parse(stored)
      for (const activity of activities) {
        await this.trackActivity(activity)
      }
      
      localStorage.removeItem('keiri_pending_activities')
    } catch (error) {
      console.error('Failed to sync pending activities:', error)
    }
  }
}

// グローバルインスタンス
let activityTracker: ActivityTracker | null = null

export const getActivityTracker = (): ActivityTracker => {
  if (!activityTracker && typeof window !== 'undefined') {
    activityTracker = new ActivityTracker()
  }
  return activityTracker!
}

// 便利な関数をエクスポート
export const trackFeatureUse = (featureName: string, success: boolean = true, duration?: number) => {
  return getActivityTracker()?.trackFeatureUse(featureName, success, duration)
}

export const trackFormSubmit = (formName: string, success: boolean = true, errors?: string[]) => {
  return getActivityTracker()?.trackFormSubmit(formName, success, errors)
}

export const trackAPICall = (endpoint: string, method: string, duration: number, success: boolean) => {
  return getActivityTracker()?.trackAPICall(endpoint, method, duration, success)
}