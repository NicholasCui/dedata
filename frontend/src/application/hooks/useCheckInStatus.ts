/* eslint-disable react/jsx-no-comment-textnodes */
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface CheckInStatus {
  checkInId: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  payoutStatus?: 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  txHash?: string
  error?: string
}

export function useCheckInStatusPolling(checkInId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient()
  const [pollingInterval, setPollingInterval] = useState<number | false>(false)
  const toastShownRef = useRef<Set<string>>(new Set())

  const { data: checkInStatus, isLoading } = useQuery({
    queryKey: ['checkin-status', checkInId],
    queryFn: async (): Promise<CheckInStatus> => {
      if (!checkInId) throw new Error('No check-in ID provided')
      
      const response = await fetch(`/api/checkins/${checkInId}/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch check-in status')
      }
      return response.json()
    },
    enabled: enabled && !!checkInId,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
  })

  // Handle status changes and show appropriate toasts
  useEffect(() => {
    if (!checkInStatus || !checkInId) return

    const toastKey = `${checkInId}-${checkInStatus.status}`
    
    if (toastShownRef.current.has(toastKey)) return

    switch (checkInStatus.status) {
      case 'SUCCESS':
        toast.success('Check-in completed! +10 DDATA earned', {
          duration: 4000,
          icon: '✅'
        })
        toastShownRef.current.add(toastKey)
        setPollingInterval(false) // Stop polling on success
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
        queryClient.invalidateQueries({ queryKey: ['checkins', 'me'] })
        queryClient.invalidateQueries({ queryKey: ['activities'] })
        queryClient.invalidateQueries({ queryKey: ['tokens', 'trends'] }) // Refresh EARNINGS_TREND
        break
        
      case 'FAILED':
        toast.error(checkInStatus.error || 'Check-in failed. Please try again.', {
          duration: 6000,
          icon: '❌'
        })
        toastShownRef.current.add(toastKey)
        setPollingInterval(false) // Stop polling on failure
        break
        
      case 'PENDING':
        // Continue polling for pending status
        if (!pollingInterval) {
          setPollingInterval(3000) // Poll every 3 seconds
        }
        break
    }
  }, [checkInStatus, checkInId, queryClient, pollingInterval])

  // Start polling when enabled
  useEffect(() => {
    if (enabled && checkInId && !pollingInterval) {
      setPollingInterval(3000)
    }
  }, [enabled, checkInId, pollingInterval])

  // Cleanup
  useEffect(() => {
    return () => {
      setPollingInterval(false)
      toastShownRef.current.clear()
    }
  }, [])

  return {
    checkInStatus,
    isLoading,
    isPolling: pollingInterval !== false
  }
}

// Hook for checking pending check-ins on app startup
export function usePendingCheckIns() {
  const queryClient = useQueryClient()
  
  const { data: pendingCheckIns } = useQuery({
    queryKey: ['checkins', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/checkins/pending')
      if (!response.ok) return []
      return response.json()
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  })

  // Auto-start polling for any pending check-ins
  const [activePolling, setActivePolling] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!pendingCheckIns?.length) return

    pendingCheckIns.forEach((checkIn: any) => {
      if (!activePolling.has(checkIn.id)) {
        setActivePolling(prev => new Set([...prev, checkIn.id]))
      }
    })
  }, [pendingCheckIns, activePolling])

  return {
    pendingCheckIns: pendingCheckIns || [],
    hasPendingCheckIns: (pendingCheckIns?.length || 0) > 0
  }
}