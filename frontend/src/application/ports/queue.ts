export interface TokenPayoutJob {
  payoutId: string
  did: string
  amount: bigint
  retryCount?: number
}

export interface TokenPayoutQueue {
  enqueue(job: TokenPayoutJob): Promise<void>
  dequeue(): Promise<TokenPayoutJob | null>
  markAsProcessing(payoutId: string): Promise<void>
  markAsCompleted(payoutId: string, txHash: string): Promise<void>
  markAsFailed(payoutId: string, error: string): Promise<void>
  getQueueLength(): Promise<number>
  getFailedJobs(limit?: number): Promise<TokenPayoutJob[]>
}

export interface EventBus {
  publish(event: any): Promise<void>
  subscribe(eventType: string, handler: (event: any) => Promise<void>): void
}