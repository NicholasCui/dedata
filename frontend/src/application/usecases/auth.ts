import { UserRepository, ProfileRepository, SessionRepository } from '../ports/repositories'
import { AuthService, RateLimiter } from '../ports/services'
import { User, Session } from '@/domain/entities/user'

export class LoginUseCase {
  constructor(
    private userRepo: UserRepository,
    private sessionRepo: SessionRepository,
    private authService: AuthService
  ) {}

  async generateNonce(address: string): Promise<{ nonce: string; message: string }> {
    return this.authService.generateNonce(address)
  }

  async verifyAndLogin(
    address: string,
    message: string,
    signature: string,
    chainId: number
  ): Promise<{ session: Session; isNewUser: boolean }> {
    // Verify signature
    const isValid = await this.authService.verifySignature(address, message, signature)
    if (!isValid) {
      throw new Error('Invalid signature')
    }

    // Find or create user
    let user = await this.userRepo.findByWalletAddress(address, chainId)
    let isNewUser = false

    if (!user) {
      const did = this.authService.createDid(address, chainId)
      user = await this.userRepo.create({
        did,
        walletAddress: address,
        chainId,
        role: 'USER',
        status: 'ACTIVE',
        profileCompleted: false
      })
      isNewUser = true
    }

    // Create session
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    const session = await this.sessionRepo.create({
      userId: user.id,
      did: user.did,
      address: user.walletAddress,
      walletAddress: user.walletAddress,
      chainId: user.chainId,
      role: user.role,
      profileCompleted: user.profileCompleted,
      expiresAt
    })

    return { session, isNewUser }
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepo.delete(sessionId)
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.sessionRepo.findById(sessionId)
    if (!session) return null

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.sessionRepo.delete(sessionId)
      return null
    }

    // Load user data
    const user = await this.userRepo.findById(session.userId)
    if (!user) return null

    return {
      ...session,
      user
    }
  }
}