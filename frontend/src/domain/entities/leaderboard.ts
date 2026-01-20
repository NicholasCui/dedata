export interface LeaderboardUser {
    rank: number;id: string
  did: string
  walletAddress: string
  chainId: number
  profileCompleted: boolean
  displayName?: string
    totalCheckins: number
    totalRewards: string
  isMe?: boolean
}

export interface LeaderboardResponse {
  data: LeaderboardUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
