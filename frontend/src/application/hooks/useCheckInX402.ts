/**
 * useCheckInX402 Hook - Using React Query and apiClient
 * Supports automatic order status polling
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X402Challenge } from '@/domain/entities'
import { checkInsApi } from '@/infrastructure/api/endpoints/checkins'

interface UseCheckInX402Return {
  checkIn: () => Promise<void>
  verifyPayment: (orderId: string) => Promise<boolean>
  startPolling: (orderId: string) => void
  stopPolling: () => void
  loading: boolean
  challenge: X402Challenge | null
  error: string | null
  success: boolean
  alreadyCheckedIn: boolean
  isPolling: boolean
  nextPollTime: number | null
}

export function useCheckInX402(): UseCheckInX402Return {
  const [challenge, setChallenge] = useState<X402Challenge | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [nextPollTime, setNextPollTime] = useState<number | null>(null)

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollCountRef = useRef(0)

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: checkInsApi.create,
    onSuccess: (data) => {
      console.log('[CheckIn] Response data:', data)

      // Check for payment challenge first (402 response)
      if (data.data?.l402_challenge) {
        console.log('[CheckIn] Payment required, challenge:', data.data.l402_challenge)
        setChallenge(data.data.l402_challenge)
        setSuccess(false)
        setAlreadyCheckedIn(false)
        setError(null)
        return
      }

      // Then check for already checked in
      if (data.success && data.data?.alreadyCheckedIn) {
        console.log('[CheckIn] Already checked in')
        setSuccess(true)
        setAlreadyCheckedIn(true)
        setChallenge(null)
        setError(null)
        return
      }

      // Then check for successful check-in
      if (data.success) {
        console.log('[CheckIn] Check-in successful')
        setSuccess(true)
        setChallenge(null)
        setError(null)
        return
      }

      // Otherwise it's a failure
      console.log('[CheckIn] Failed:', data.message)
      setError(data.message || 'Check-in failed')
      setSuccess(false)
      setChallenge(null)
    },
    onError: (err: any) => {
      console.error('[CheckIn] Error:', err)
      setError(err.message || 'Network error')
      setSuccess(false)
      setChallenge(null)
    },
  })

  // Verify payment mutation
  const verifyMutation = useMutation({
    mutationFn: checkInsApi.verify,
    onSuccess: (data) => {
      if (data.success) {
        // Payment verified successfully, check-in complete
        setSuccess(true)
        setChallenge(null)
        setAlreadyCheckedIn(false)
        stopPolling()
      } else {
        // Payment not completed or other error
        if (data.message === 'PENDING_CONFIRMATION') {
          setError('Payment submitted, waiting for blockchain confirmation...')
        } else if (data.message === 'NO_TRANSACTION') {
          setError('No payment transaction detected')
        } else if (data.message === 'INSUFFICIENT_AMOUNT') {
          setError('Insufficient payment amount')
        } else {
          setError(data.message || 'Payment verification failed')
        }
      }
    },
    onError: (err: any) => {
      setError(err.message || 'Network error')
    },
  })

  /**
   * Initiate check-in request
   */
  const checkIn = useCallback(async () => {
    setError(null)
    setSuccess(false)
    setChallenge(null)
    setAlreadyCheckedIn(false)

    await checkInMutation.mutateAsync()
  }, [checkInMutation])

  /**
   * Verify payment status
   */
  const verifyPayment = useCallback(async (orderId: string): Promise<boolean> => {
    setError(null)

    try {
      const result = await verifyMutation.mutateAsync({ order_id: orderId })
      return result.success
    } catch (err) {
      return false
    }
  }, [verifyMutation])

  /**
   * Start polling order status
   * Strategy: Poll every 30 seconds, maximum 3 times
   */
  const startPolling = useCallback((orderId: string) => {
    stopPolling() // Stop previous polling first

    pollCountRef.current = 0
    setIsPolling(true)

    const poll = async () => {
      if (pollCountRef.current >= 3) {
        // Reached maximum polling count
        setIsPolling(false)
        setNextPollTime(null)
        setError('Verification timeout, please check manually')
        return
      }

      pollCountRef.current += 1
      console.log(`Auto polling #${pollCountRef.current}, order_id: ${orderId}`)

      const isSuccess = await verifyPayment(orderId)

      if (isSuccess) {
        // Payment successful, stop polling
        setIsPolling(false)
        setNextPollTime(null)
        return
      }

      // Continue polling after 30 seconds
      if (pollCountRef.current < 3) {
        const nextTime = Date.now() + 30000 // 30 seconds
        setNextPollTime(nextTime)

        pollingTimerRef.current = setTimeout(() => {
          poll()
        }, 30000)
      } else {
        setIsPolling(false)
        setNextPollTime(null)
      }
    }

    // Execute immediately first time
    poll()
  }, [verifyPayment])

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
    setIsPolling(false)
    setNextPollTime(null)
    pollCountRef.current = 0
  }, [])

  // Clean up polling on component unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    checkIn,
    verifyPayment,
    startPolling,
    stopPolling,
    loading: checkInMutation.isPending || verifyMutation.isPending,
    challenge,
    error,
    success,
    alreadyCheckedIn,
    isPolling,
    nextPollTime,
  }
}
