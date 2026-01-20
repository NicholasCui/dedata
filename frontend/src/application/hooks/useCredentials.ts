import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { credentialsApi, type VerifiableCredential } from '@/infrastructure/api/endpoints/credentials'
import toast from 'react-hot-toast'

// Query keys
const CREDENTIAL_KEYS = {
  profile: ['credential', 'profile'] as const,
  tokenSummary: ['credential', 'tokenSummary'] as const
}

// Hook to get profile credential
export function useProfileCredential() {
  return useQuery<VerifiableCredential>({
    queryKey: CREDENTIAL_KEYS.profile,
    queryFn: credentialsApi.getProfileCredential,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}

// Hook to reissue profile credential
export function useReissueProfileCredential() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: credentialsApi.reissueProfileCredential,
    onSuccess: (data) => {
      queryClient.setQueryData(CREDENTIAL_KEYS.profile, data)
      toast.success('Credential reissued successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reissue credential')
    }
  })
}

// Hook to get token summary credential
export function useTokenSummaryCredential() {
  return useQuery<VerifiableCredential>({
    queryKey: CREDENTIAL_KEYS.tokenSummary,
    queryFn: credentialsApi.getTokenSummaryCredential,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}