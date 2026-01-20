import { useAccount, useSignMessage } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  backendAuthApi,
  backendUserApi,
  type VerifySignatureResponse,
} from '@/infrastructure/api/endpoints/backend-auth'

/**
 * Go 后端认证 Hook
 * 使用 Go 后端的认证系统 (http://localhost:8080/api)
 */

export function useBackendAuth() {
  const { address, chainId, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Loading state tracking
  const [loadingStep, setLoadingStep] = useState<
    'nonce' | 'signing' | 'verifying' | null
  >(null)
  const [nonce, setNonce] = useState<string | null>(null)

  // Get user info (只有登录后才请求)
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['backend-auth', 'user'],
    queryFn: backendUserApi.getMe,
    staleTime: 5 * 60 * 1000,
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!address || !chainId) {
        throw new Error('Wallet not connected')
      }

      try {
        // Step 1: Get nonce
        setLoadingStep('nonce')
        const nonceResponse = await backendAuthApi.getNonce({
          walletAddress: address,
        })
        const currentNonce = nonceResponse.nonce
        setNonce(currentNonce)

        console.log('[useBackendAuth] Got nonce:', currentNonce)

        // Step 2: 构造签名消息
        const message = `Sign this message to authenticate with DeData Protocol\n\nNonce: ${currentNonce}`
        console.log('[useBackendAuth] Message to sign:', message)

        // Step 3: Sign message
        setLoadingStep('signing')
        const signature = await signMessageAsync({ message })
        console.log('[useBackendAuth] Signature:', signature)

        // Step 4: Verify signature
        setLoadingStep('verifying')
        console.log('[useBackendAuth] Verifying with:', {
          walletAddress: address,
          nonce: currentNonce,
          signature,
          message,
        })

        const verifyResponse = await backendAuthApi.verifySignature({
          walletAddress: address,
          nonce: currentNonce,
          signature,
        })

        // 保存 JWT token 到 localStorage
        if (verifyResponse.token) {
          localStorage.setItem('jwt_token', verifyResponse.token)
        }

        return verifyResponse
      } finally {
        setLoadingStep(null)
        setNonce(null)
      }
    },
    onSuccess: (data: VerifySignatureResponse) => {
      console.log('[useBackendAuth] Login success:', {
        userID: data.user.id,
        did: data.user.did,
        address: data.user.walletAddress,
      })

      // 刷新 session 和 user 数据
      queryClient.invalidateQueries({ queryKey: ['backend-auth', 'session'] })
      queryClient.invalidateQueries({ queryKey: ['backend-auth', 'user'] })

      // 根据用户状态跳转
      // TODO: 检查 profile 是否完成，Go 后端暂时没有这个字段
      if (!data.user.profileCompleted) {
        router.push('/dashboard/auth/pending-profile')
        toast.success('Welcome! Please complete your profile.')
      } else {
        router.push('/dashboard')
        toast.success('Welcome back!')
      }
    },
    onError: (error: any) => {
      console.error('[useBackendAuth] Login failed:', error)
      const message = error.message || 'Failed to login'
      toast.error(message)

      // 清除可能的脏数据
      setNonce(null)
      localStorage.removeItem('jwt_token')
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await backendAuthApi.logout()
      } catch (error) {
        // 即使后端 logout 失败，也要清除前端状态
        console.warn(
          '[useBackendAuth] Backend logout failed, clearing local state anyway'
        )
      }
    },
    onSuccess: () => {
      // 清除本地存储
      localStorage.removeItem('jwt_token')

      // 清除所有 query 缓存
      queryClient.clear()

      // 跳转到首页
      router.push('/')
      toast.success('Logged out successfully')
    },
    onError: () => {
      // 即使出错也清除本地状态
      localStorage.removeItem('jwt_token')
      queryClient.clear()
      router.push('/')
    },
  })

  return {
    // State
    isConnected,
    address,
    chainId,
    user,
    userLoading,
    isAuthenticated: !!user,
    loadingStep,
    nonce,

    // Actions
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,

    // Error
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
  }
}
