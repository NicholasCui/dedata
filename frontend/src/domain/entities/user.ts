export interface User {
  id: string
  did: string
  walletAddress: string
  chainId: number
  role: 'USER' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED' | 'BLACKLISTED'
  profileCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Profile {
  id: string
  userId: string
  displayName?: string
  email?: string
  telegram?: string
  bio?: string
  avatar?: string
  completedAt?: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  did: string
  address: string
  walletAddress: string
  chainId: number
  role: 'USER' | 'ADMIN'
  profileCompleted: boolean
  user?: User
  profile?: Profile
  expiresAt: Date
  createdAt: Date
}