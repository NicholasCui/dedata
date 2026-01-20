import { useEffect, useRef } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useBackendAuth } from './useBackendAuth'
import { toast } from 'react-hot-toast'

/**
 * Hook to detect wallet address changes and handle re-authentication
 * Should be used in the main layout or app component
 *
 * Note: useBackendAuth already has built-in wallet change detection,
 * but this hook is kept for additional custom behavior if needed.
 */
export function useWalletChangeDetection() {
  const { address: currentAddress } = useAccount()
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, logout } = useBackendAuth()
  const isHandlingChange = useRef(false)

  useEffect(() => {
    // Only check if user is logged in and has a session
    if (!user?.walletAddress || !currentAddress) {
      console.log('Skipping wallet change detection - missing data', { user: !!user, currentAddress: !!currentAddress })
      return
    }

    // Check if wallet address has changed
    if (currentAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
      // Prevent multiple concurrent wallet change handling
      if (isHandlingChange.current) {
        console.log('Already handling wallet change, skipping')
        return
      }

      console.log('Wallet address changed, logging out...', {
        current: currentAddress,
        session: user.walletAddress
      })
      isHandlingChange.current = true

      toast('Wallet changed. Please sign in again.', {
        duration: 4000,
        icon: '🔄',
        style: {
          background: '#1f2937',
          color: '#00ff41',
          border: '1px solid #00ff41'
        }
      })

      // Handle wallet change
      const handleWalletChange = async () => {
        try {
          console.log('Starting wallet change handling')

          // Clear all React Query cache immediately
          queryClient.clear()
          console.log('Cache cleared')

          // Call logout API to clear server session
          logout()
          console.log('Logout called')

        } catch (error) {
          console.error('Logout error on wallet change:', error)
        } finally {
          console.log('Disconnecting wallet and redirecting')

          // Disconnect wallet
          disconnect()

          // Force page reload to ensure clean state
          window.location.href = '/'

          // Reset flag
          isHandlingChange.current = false
        }
      }

      handleWalletChange()
    }
  }, [currentAddress, user?.walletAddress, queryClient, logout, disconnect, router])
}