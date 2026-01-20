import { backendRequest } from '../backend-client'
import type { X402Challenge } from '@/domain/entities'

export interface CheckInResponse {
  success: boolean
  message: string
  data?: {
    checkIn?: any
    payout?: any
    l402_challenge?: X402Challenge
    alreadyCheckedIn?: boolean
  }
}

export interface VerifyPaymentRequest {
  order_id: string
}

export interface DailyStat {
  date: string
  token_amount: string
}

export interface CheckInSummary {
  checkedInToday: boolean
  dailyStats: DailyStat[]
  lastCheckinAt: string
  rank: number
  totalCheckins: number
  totalRewards: string
}

export type CheckInStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'payment_success'
  | 'issuing'
  | 'success'
  | 'issue_failed'

export interface CheckInRecord {
  id: string
  userId: string
  status: CheckInStatus
  createdAt: string
  updatedAt: string
  issuedAt?: string

  // Token issue info
  tokenAmount?: string
  issueTxHash?: string

  // x402 payment info
  orderId?: string
  paymentAddress?: string
  priceAmount?: string
  blockchainName?: string
  tokenSymbol?: string
  paymentExpiresAt?: string
  paymentTxHash?: string

  // Retry and failure info
  retryCount?: number
  failureReason?: string
}

export interface CheckInListResponse {
    list: CheckInRecord[]
    total: number
    page: number
    pageSize: number
}

export const checkInsApi = {
  /**
   * Initiate check-in - Returns 200 (already checked in) or 402 (payment required)
   */
  create: () =>
    backendRequest.post<CheckInResponse>('/checkin', {}),

  /**
   * Verify payment and complete check-in
   */
  verify: (data: VerifyPaymentRequest) =>
    backendRequest.post<CheckInResponse>('/checkin/verify', data),

  /**
   * Get check-in history
   */
  list: (params?: { page?: number; limit?: number }) =>
    backendRequest.get('/checkins', { params }),

  /**
   * Get most recent check-in
   */
  getRecent: () =>
    backendRequest.get('/checkins?recent=true'),

  /**
   * Get check-in summary
   */
  getSummary: () =>
    backendRequest.get<CheckInSummary>('/checkin/summary'),

  /**
   * Get user's check-in records
   */
  getMyCheckIns: (params?: { page?: number; pageSize?: number }) =>
    backendRequest.get<CheckInListResponse>('/checkin/my', { params }),
}
