export interface Authorization {
  id: string
  userId: string
  clientId: string
  scopes: string[]
  token: string
  expiresAt: Date
  revokedAt?: Date
  lastUsedAt?: Date
  createdAt: Date
}

export interface DidApiLog {
  id: string
  clientId: string
  did: string
  endpoint: string
  scope: string
  success: boolean
  errorReason?: string
  responseTime: number
  createdAt: Date
}