import { backendRequest } from '../backend-client'
import type { ActivityLog } from '@/domain/entities'

export const activitiesApi = {
  list: (params?: { page?: number; pageSize?: number }) => 
    backendRequest.get<{data: ActivityLog[], total: number}>('/activities', { params }),
    
  get: (id: string) => 
    backendRequest.get<ActivityLog>(`/activities/${id}`),
    
  create: (data: Partial<ActivityLog>) => 
    backendRequest.post<ActivityLog>('/activities', data),
}