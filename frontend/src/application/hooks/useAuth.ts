import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, userApi } from '@/infrastructure/api/endpoints/auth'
import {
  checkInApi,
  dashboardApi,
  authorizationApi,
} from '@/infrastructure/api/endpoints/user'
import { checkInsApi } from '@/infrastructure/api/endpoints/checkins'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear() // 清除所有缓存
      router.push('/')
    },
  })
}

// User Profile Hooks
export function useMe() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: userApi.getMe,
  })
}

// User Profile Hooks
export function useProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: userApi.getProfile,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'profile'], data)
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      toast?.success('Profile updated successfully')
    },
    onError: () => {
      toast?.error('Failed to update profile')
    },
  })
}

export function useUserLogs(params?: { type?: string; page?: number }) {
  const { data: session } = useProfile()

  return useQuery({
    queryKey: ['user', 'logs', params],
    queryFn: () => userApi.getLogs(params),
    enabled: !!session,
  })
}

// Check-in Hooks
export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: checkInApi.checkIn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checkins', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['tokens', 'trends'] }) // Refresh EARNINGS_TREND
      toast?.success('Check-in successful! +10 DDATA')
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Check-in failed'
      toast?.error(message)
    },
  })
}

export function useCheckInSummary() {
  const { data: session } = useProfile()

  return useQuery({
    queryKey: ['checkins', 'summary'],
    queryFn: async () => checkInsApi.getSummary(),
    enabled: !!session,
    staleTime: 30000, // Cache for 30 seconds
  })
}

export function useMyCheckInList(params?: { page?: number; pageSize?: number }) {
  const { data: session } = useProfile()

  return useQuery({
    queryKey: ['checkins', 'list', params],
    queryFn: async () =>  checkInsApi.getMyCheckIns(params),
    enabled: !!session,
    staleTime: 10000, // Cache for 10 seconds
  })
}

// Authorization Hooks
export function useAuthorizations() {
  const { data: session } = useProfile()

  return useQuery({
    queryKey: ['authorizations'],
    queryFn: authorizationApi.list,
    enabled: !!session,
  })
}

export function useCreateAuthorization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authorizationApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['authorizations'] })
      toast?.success('Authorization created successfully')
    },
    onError: () => {
      toast?.error('Failed to create authorization')
    },
  })
}

export function useRevokeAuthorization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authorizationApi.revoke,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorizations'] })
      toast?.success('Authorization revoked')
    },
    onError: () => {
      toast?.error('Failed to revoke authorization')
    },
  })
}

// Payout Hooks
export function useRecentPayouts(params?: { limit?: number }) {
  const { data: session } = useProfile()

  return useQuery({
    queryKey: ['payouts', 'recent', params],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return []
    },
    enabled: !!session,
  })
}

// Token Summary Hook
export function useTokenSummary() {
  const { data: session } = useProfile()

  return useQuery({
    queryKey: ['tokens', 'summary'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return {
        totalEarned: 0,
        todayEarned: 0,
        balance: 0,
        recentTransactions: [],
      }
    },
    enabled: !!session,
  })
}
