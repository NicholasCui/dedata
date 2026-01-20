import { backendRequest } from '../backend-client'
import { CheckIn, TokenPayout, DashboardSummary, Authorization, LeaderboardResponse } from '@/domain/entities'

export const checkInApi = {
  // 执行签到
  checkIn: () =>
    backendRequest.post<CheckIn>('/checkins'),
 }

export const payoutApi = {
  // 获取我的发放记录
  getMyPayouts: (params?: { page?: number; limit?: number; status?: string; tokenType?: string }) =>
    backendRequest.get<TokenPayout[]>('/payouts', { params }),
}

export const dashboardApi = {

}

export const authorizationApi = {
  // 创建授权
  create: (data: { platform: string; scope: string; expiresAt?: string }) =>
    backendRequest.post<Authorization>('/authorizations', data),

  // 获取授权列表
  list: () =>
    backendRequest.get<Authorization[]>('/authorizations'),

  // 撤销授权
  revoke: (id: string) =>
    backendRequest.delete(`/authorizations/${id}`),
}

export const leaderboardApi = {
  // 获取排行榜
  getLeaderboard: (params?: { page?: number; limit?: number }) =>
    backendRequest.get<LeaderboardResponse>('/user/leaderboard', { params }),
}