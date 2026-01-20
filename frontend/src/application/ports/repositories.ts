import { User, Profile, Session } from '@/domain/entities/user'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByDid(did: string): Promise<User | null>
  findByWalletAddress(address: string, chainId: number): Promise<User | null>
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  update(id: string, data: Partial<User>): Promise<User>
  delete(id: string): Promise<void>
}

export interface ProfileRepository {
  findByUserId(userId: string): Promise<Profile | null>
  create(profile: Omit<Profile, 'id' | 'updatedAt'>): Promise<Profile>
  update(userId: string, data: Partial<Profile>): Promise<Profile>
}

export interface SessionRepository {
  create(session: Omit<Session, 'id' | 'createdAt'>): Promise<Session>
  findById(id: string): Promise<Session | null>
  update(id: string, data: Partial<Session>): Promise<Session>
  delete(id: string): Promise<void>
  deleteByUserId(userId: string): Promise<void>
}