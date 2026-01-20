/**
 * X402 Payment Service Client
 * 直接调用 X402 底层服务
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

export class X402Client {
  private baseUrl: string
  private apiToken: string
  private merchantId: string

  constructor() {
    // Development: remote address, Production: local port 8086
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'http://localhost:8086'
      : 'http://142.171.111.91:8086'

    this.apiToken = process.env.X402_API_TOKEN || 'f2862d33852fa09bd6b8b265d5bd1b3195e8e2c33a442127f15004b43893ddb1'
    this.merchantId = process.env.X402_MERCHANT_ID || '1'
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Token': this.apiToken,
      'X-Merchant-ID': this.merchantId,
    }
  }

  /**
   * Create daily check-in payment challenge - Backend calls X402 service
   * Returns 200 if already checked in; otherwise returns 402 payment challenge
   */
  async createDailyCheckinChallenge(merchantUserId: string, checkinDate?: string): Promise<{
    status: number
    challenge?: X402Challenge
    response?: X402ApiResponse
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/business/daily-checkin`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          merchant_id: this.merchantId,
          merchant_user_id: merchantUserId,
          checkin_date: checkinDate || new Date().toISOString().split('T')[0], // YYYY-MM-DD
        }),
      })

      const json: X402ApiResponse<{ l402_challenge: X402Challenge }> = await response.json()

      if (response.status === 402) {
        return {
          status: 402,
          challenge: json.data?.l402_challenge,
          response: json,
        }
      }

      return {
        status: response.status,
        response: json,
      }
    } catch (error) {
      console.error('X402 createDailyCheckinChallenge error:', error)
      throw new Error('Failed to create daily check-in challenge')
    }
  }

  /**
   * Verify payment status (requires merchant_user_id)
   */
  async verifyPayment(params: {
    order_id: string
    merchant_id: string
    merchant_user_id: string
  }): Promise<X402ApiResponse<{
    order: any
    validation_result: any
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/api/x402/verify`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      })

      return await response.json()
    } catch (error) {
      console.error('X402 verifyPayment error:', error)
      throw new Error('Failed to verify payment')
    }
  }

  /**
   * Settle order (optional)
   */
  async settlePayment(orderId: string): Promise<X402ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/api/x402/settle`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ order_id: orderId }),
      })

      return await response.json()
    } catch (error) {
      console.error('X402 settlePayment error:', error)
      throw new Error('Failed to settle payment')
    }
  }
}

// Create singleton instance
export const x402Client = new X402Client()
