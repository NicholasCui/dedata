'use client'
import { useMe, useProfile } from '@/application/hooks/useAuth'
import { PendingProfileClient } from './PendingProfileClient'

export default function PendingProfilePage() {
  const { data: profile, isLoading } = useMe()
  if (isLoading) {
    return 'Loading...'
  }
  return (
    <PendingProfileClient 
      userId={profile?.id!}
      address={profile?.walletAddress!}
    />
  )
}