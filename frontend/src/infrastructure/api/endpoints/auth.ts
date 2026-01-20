import { User, Profile } from '@/domain/entities'
import { backendRequest } from '@/infrastructure/api/backend-client'

export const authApi = {
  // 获取 nonce
  getNonce: (wallet: string) => 
    backendRequest.get<{ nonce: string; message: string }>('/auth/nonce', { params: { wallet } }),

  // 验证签名并登录
  verify: (data: { message: string; signature: string; address: string }) =>
    backendRequest.post<{ success: boolean; sessionToken: string; user: any }>('/auth/verify', data),

  // 登出
  logout: () =>
    backendRequest.post<{ success: boolean }>('/auth/logout'),
}

export const userApi = {
  // 获取当前用户信息
  getMe: () =>
    backendRequest.get<User & { profile?: Profile }>('/user/me'),

  // 获取用户 profile
  getProfile: () =>
    backendRequest.get<Profile>('/user/profile'),

  // 更新用户资料
  updateProfile: (data: Partial<Profile>) =>
    backendRequest.put<Profile>('/user/profile', data),

  // 获取用户日志
  getLogs: (params?: { type?: string; page?: number; limit?: number }) =>
    backendRequest.get<any[]>('/users/me/logs', { params }),
}