import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesApi } from '@/infrastructure/api/endpoints/activities'
import type { ActivityLog } from '@/domain/entities'

export function useActivities(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => activitiesApi.list(params),
  })
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ['activities', id],
    queryFn: () => activitiesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: activitiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}