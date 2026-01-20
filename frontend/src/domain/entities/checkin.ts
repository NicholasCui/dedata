export interface CheckIn {
  id: string
  userId: string
  did: string
  date: Date
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  payoutId?: string
  createdAt: Date
  updatedAt: Date
}

export interface TokenPayout {
  id: string
  userId: string
  did: string
  amount: string // Use string for bigint compatibility
  status: 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'FAILED_PERMANENT'
  txHash?: string
  errorReason?: string
  retryCount: number
  checkInId?: string
  createdAt: Date
  processedAt?: Date
}