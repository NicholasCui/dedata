import { CheckIn, TokenPayout } from '@/domain/entities/checkin'
import { RateLimiter, TokenTransferService } from '../ports/services'
import { TokenPayoutQueue } from '../ports/queue'

interface CheckInRepository {
  findByUserAndDate(userId: string, date: Date): Promise<CheckIn | null>
  create(checkIn: Omit<CheckIn, 'id' | 'createdAt' | 'updatedAt'>): Promise<CheckIn>
  update(id: string, data: Partial<CheckIn>): Promise<CheckIn>
}

interface TokenPayoutRepository {
  create(payout: Omit<TokenPayout, 'id' | 'createdAt'>): Promise<TokenPayout>
  findById(id: string): Promise<TokenPayout | null>
  update(id: string, data: Partial<TokenPayout>): Promise<TokenPayout>
  findPendingByUserId(userId: string): Promise<TokenPayout[]>
}

export class CheckInUseCase {
  private readonly DAILY_REWARD = BigInt('10000000000000000000') // 10 tokens

  constructor(
    private checkInRepo: CheckInRepository,
    private payoutRepo: TokenPayoutRepository,
    private rateLimiter: RateLimiter,
    private queue: TokenPayoutQueue
  ) {}

  async createDailyCheckIn(userId: string, did: string): Promise<CheckIn> {
    // Check if already checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingCheckIn = await this.checkInRepo.findByUserAndDate(userId, today)
    if (existingCheckIn) {
      throw new Error('Already checked in today')
    }

    // Verify rate limit
    await this.rateLimiter.assertDailyCheckIn(did, today)

    // Create check-in record
    const checkIn = await this.checkInRepo.create({
      userId,
      did,
      date: today,
      status: 'PENDING'
    })

    // Create payout record
    const payout = await this.payoutRepo.create({
      userId,
      did,
      amount: this.DAILY_REWARD.toString(),
      status: 'QUEUED',
      checkInId: checkIn.id,
      retryCount: 0
    })

    // Update check-in with payout ID
    await this.checkInRepo.update(checkIn.id, {
      payoutId: payout.id
    })

    // Enqueue payout job
    await this.queue.enqueue({
      payoutId: payout.id,
      did,
      amount: this.DAILY_REWARD
    })

    // Publish event - EventBus not yet implemented
    // await this.eventBus.publish({
    //   type: 'CHECK_IN_CREATED',
    //   checkInId: checkIn.id,
    //   userId,
    //   did
    // })

    return checkIn
  }

  async getCheckInStatus(checkInId: string): Promise<CheckIn | null> {
    // This would be implemented with proper repository method
    return null
  }

  async retryPayout(payoutId: string, userId: string): Promise<void> {
    const payout = await this.payoutRepo.findById(payoutId)
    
    if (!payout) {
      throw new Error('Payout not found')
    }

    if (payout.userId !== userId) {
      throw new Error('Unauthorized')
    }

    if (payout.status === 'SUCCESS') {
      throw new Error('Payout already successful')
    }

    if (payout.retryCount >= 3) {
      throw new Error('Max retries exceeded')
    }

    // Update status and enqueue
    await this.payoutRepo.update(payoutId, {
      status: 'QUEUED',
      retryCount: payout.retryCount + 1
    })

    await this.queue.enqueue({
      payoutId: payout.id,
      did: payout.did,
      amount: BigInt(payout.amount),
      retryCount: payout.retryCount + 1
    })

    // Publish event - EventBus not yet implemented
    // await this.eventBus.publish({
    //   type: 'PAYOUT_RETRIED',
    //   payoutId,
    //   userId
    // })
  }
}