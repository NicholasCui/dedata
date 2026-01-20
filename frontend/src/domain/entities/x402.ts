/**
 * X402 支付相关类型定义
 */

export interface X402Challenge {
  order_id: string
  payment_address: string
  price_amount: string
  blockchain_name: string
  token_symbol: string
  expires_at: string
}

export interface X402ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

export interface X402CheckInResponse {
  success: boolean
  message: string
  data?: {
    l402_challenge?: X402Challenge
    checkIn?: any
    alreadyCheckedIn?: boolean
  }
}

export interface X402VerifyResponse {
  success: boolean
  message: string
  data?: {
    order?: any
    validation_result?: any
    checkIn?: any
    payout?: {
      id: string
      amount: string
      status: string
    }
  }
}

export interface X402SettleResponse {
  success: boolean
  message: string
  data?: any
}
