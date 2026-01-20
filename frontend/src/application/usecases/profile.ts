import { UserRepository, ProfileRepository } from '../ports/repositories'
import { CredentialService } from '../ports/services'
import { Profile } from '@/domain/entities/user'

export class ProfileUseCase {
  constructor(
    private userRepo: UserRepository,
    private profileRepo: ProfileRepository,
    private credentialService: CredentialService
  ) {}

  async getProfile(userId: string): Promise<Profile | null> {
    return this.profileRepo.findByUserId(userId)
  }

  async completeProfile(
    userId: string,
    data: {
      displayName: string
      email?: string
      telegram?: string
      bio?: string
      avatar?: string
    }
  ): Promise<Profile> {
    // Check if user exists
    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Create or update profile
    let profile = await this.profileRepo.findByUserId(userId)
    
    if (!profile) {
      profile = await this.profileRepo.create({
        userId,
        ...data,
        completedAt: new Date()
      })

      // Mark user profile as completed
      await this.userRepo.update(userId, { profileCompleted: true })

      // Issue Profile VC
      await this.credentialService.issueProfileVC(userId, profile)

      // Publish event - EventBus not yet implemented
      // await this.eventBus.publish({
      //   type: 'PROFILE_COMPLETED',
      //   userId,
      //   profile
      // })
    } else {
      profile = await this.profileRepo.update(userId, data)

      // Re-issue Profile VC if significant changes
      if (data.displayName || data.email) {
        await this.credentialService.issueProfileVC(userId, profile)
      }

      // Publish event - EventBus not yet implemented
      // await this.eventBus.publish({
      //   type: 'PROFILE_UPDATED',
      //   userId,
      //   profile
      // })
    }

    return profile
  }

  async updateProfile(
    userId: string,
    data: Partial<Profile>
  ): Promise<Profile> {
    const profile = await this.profileRepo.findByUserId(userId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    const updated = await this.profileRepo.update(userId, data)

    // Re-issue VC if needed
    if (data.displayName || data.email) {
      await this.credentialService.issueProfileVC(userId, updated)
    }

    // Publish event - EventBus not yet implemented
    // await this.eventBus.publish({
    //   type: 'PROFILE_UPDATED',
    //   userId,
    //   profile: updated
    // })

    return updated
  }
}