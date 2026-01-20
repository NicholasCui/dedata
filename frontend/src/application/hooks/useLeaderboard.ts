import { useQuery } from '@tanstack/react-query'
import { leaderboardApi } from '@/infrastructure/api/endpoints/user'
import { LeaderboardUser, LeaderboardResponse } from '@/domain/entities'
import { useMe } from './useAuth'

export function useLeaderboard(params?: { page?: number; limit?: number }) {
  const { data: user } = useMe()

  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const data = await leaderboardApi.getLeaderboard(params)

      // Mark current user in the leaderboard
      if (user?.id) {
        data.data.forEach((leaderboardUser: LeaderboardUser) => {
          if (leaderboardUser.id === user.id) {
            leaderboardUser.isMe = true
          }
        })
      }

      return data
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}
