export interface AuthService {
  generateNonce(address: string): Promise<{ nonce: string; message: string }>
  verifySignature(address: string, message: string, signature: string): Promise<boolean>
  createDid(address: string, chainId: number): string
}

export interface TokenTransferService {
  sendReward(to: string, amount: bigint): Promise<{ txHash: string }>
  batchSendRewards(recipients: Array<{ to: string; amount: bigint }>): Promise<{ txHash: string }>
  getBalance(address: string): Promise<bigint>
}

export interface CredentialService {
  issueProfileVC(userId: string, profile: any): Promise<any>
  revokeCredential(credentialId: string): Promise<void>
  verifyCredential(credential: any): Promise<boolean>
}

export interface RateLimiter {
  assertDailyCheckIn(did: string, date: Date): Promise<void>
  checkApiLimit(clientId: string, endpoint: string): Promise<boolean>
}

export interface NotificationService {
  sendEmail(to: string, subject: string, content: string): Promise<void>
  sendWebhook(url: string, payload: any): Promise<void>
}