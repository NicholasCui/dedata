'use client'
import { useMe } from '@/application/hooks/useAuth'
import { DashboardClient } from './DashboardClient'

export default function DashboardPage() {
  // Pass only session data to client component (no pre-loading)
  const {data: profile, isLoading} = useMe()
  if (isLoading) {
    return <div>Loading...</div>
  }
  return (
    <DashboardClient 
      userId={profile?.id!}
      did={profile?.did!}
      address={profile?.walletAddress!}
    />
  )
}