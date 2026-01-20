import { backendRequest } from '../backend-client'

/**
 * Go 后端认证 API
 * 基于 docs/API.md 的接口定义
 */

// ============ Request/Response Types ============

// Nonce 请求 (简化版)
export interface GetNonceRequest {
  walletAddress: string
}

export interface GetNonceResponse {
  nonce: string
}

// 验证签名请求
export interface VerifySignatureRequest {
  walletAddress: string
  nonce: string
  signature: string
}

export interface User {
  id: string
  walletAddress: string
  did: string
  totalTokens: string
  lastCheckinAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface VerifySignatureResponse {
  token: string
  user:  {
    id: string
    did: string
    walletAddress: string
    profileCompleted: boolean
  }
}

// Session 响应
export interface SessionResponse {
  userID: string
  address: string
  did: string
  role: string
}

// ============ Auth API ============

export const backendAuthApi = {
  /**
   * 获取签名 nonce
   * POST /api/auth/nonce
   */
  getNonce: (request: GetNonceRequest) =>
    backendRequest.post<GetNonceResponse>('/auth/nonce', request),

  /**
   * 验证签名并登录
   * POST /api/auth/verify
   */
  verifySignature: (request: VerifySignatureRequest) =>
    backendRequest.post<VerifySignatureResponse>('/auth/verify', request),

  /**
   * 登出
   * POST /api/auth/logout
   */
  logout: () =>
    backendRequest.post<{ message: string }>('/auth/logout'),
}

// ============ User API ============

export const backendUserApi = {
  /**
   * 获取我的信息
   * GET /api/user/me
   */
  getMe: () =>
    backendRequest.get<User>('/user/me'),

  /**
   * 获取排行榜
   * GET /api/user/leaderboard?limit=100
   */
  getLeaderboard: (params?: { limit?: number }) =>
    backendRequest.get<{ list: User[] }>('/user/leaderboard', { params }),
}

// ============ Check-in API ============

export interface CheckIn {
  id: string
  userID: string
  status: 'external_failed' | 'issuing' | 'success' | 'issue_failed'
  tokenAmount?: string | null
  txHash?: string | null
  failureReason?: string | null
  issuedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface CheckInListResponse {
  list: CheckIn[]
  total: number
  page: number
  pageSize: number
}

export interface DailyStat {
  date: string
  token_amount: number
}

export interface CheckInSummaryResponse {
  totalTokens: string
  lastCheckinAt?: string | null
  dailyStats: DailyStat[]
}

export const backendCheckInApi = {
  /**
   * 发起签到
   * POST /api/checkin
   */
  checkIn: () =>
    backendRequest.post<CheckIn>('/checkin'),

  /**
   * 获取签到统计
   * GET /api/checkin/summary
   */
  getSummary: () =>
    backendRequest.get<CheckInSummaryResponse>('/checkin/summary'),
}

