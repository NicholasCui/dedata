export interface DashboardSummary {
  platform: {
    totalUsers: number
    recentUsers: number
    totalTokensPaid: string
    didQueriesLast24h: number
  }
  personal: {
    tokenBalance: string
    totalEarned: string
    checkInStreak: number
    totalCheckIns: number
    rank: number
    lastCheckIn?: Date | null
    canCheckIn: boolean
  }
}

export interface ActivityLog {
  id: string
  userId?: string
  type: 'LOGIN' | 'CHECK_IN' | 'PAYOUT' | 'AUTHORIZATION' | 'PROFILE_UPDATE' | 'ADMIN_ACTION'
  action: string
  metadata?: any
  ipAddress?: string
  createdAt: Date
}

export interface PlatformStats {
  registeredUsers: number
  activeUsers: number
  checkInsToday: number
  tokensPaidToday: string
  pendingPayouts: number
  failedPayouts: number
  vcIssued: number
  externalApiCalls: number
}