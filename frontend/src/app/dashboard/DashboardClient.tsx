/* eslint-disable react/jsx-no-comment-textnodes */
'use client'

import { Layout } from '@/components/layout/Layout'
import { PayoutStatusBanner } from '@/components/dashboard/PayoutStatusBanner'
import { TokenTrends } from '@/components/dashboard/TokenTrends'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { UserDashboardCard } from '@/components/dashboard/UserDashboardCard'
import { SwapCard } from '@/components/dashboard/SwapCard'
import { Terminal, Wallet } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface DashboardClientProps {
  userId: string
  did: string
  address: string
}

export function DashboardClient({ userId, did, address }: DashboardClientProps) {
  const { address: currentAddress } = useAccount()
  const [isVCModalOpen, setIsVCModalOpen] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('DashboardClient rendered with:', {
      propsAddress: address,
      currentAddress,
      userId,
      did,
    })
  }, [address, currentAddress, userId, did])
  
  return (
    <Layout>
      <div className="min-h-screen bg-black matrix-bg">
        {/* Cyber grid background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,65,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,65,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
          {/* Header Section - Simplified */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-green-500 font-mono mb-2">
                  DEDATA DASHBOARD
                </h1>
                <div className="flex items-center gap-4 text-sm font-mono text-green-400">
                  <div className="flex items-center gap-2">
                    <Terminal size={16} />
                    <span>{did}</span>
                  </div>
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <Wallet size={16} />
                    <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Status Banner */}
          <PayoutStatusBanner />

          {/* Main Content - Two Column Layout: Dashboard (Left) + Swap (Right) */}
          <div className="grid lg:grid-cols-10 gap-6 mb-6">
            {/* Left Column - User Dashboard (Stats + Check-in) (6/10 width) */}
            <div className="lg:col-span-6">
              <UserDashboardCard />
            </div>

            {/* Right Column - Token Swap (4/10 width) */}
            <div className="lg:col-span-4">
              <SwapCard />
            </div>
          </div>

          {/* Analytics - Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Token Trends */}
            <div className="h-[500px]">
              <TokenTrends days={30} />
            </div>

            {/* Right Column - Activity Timeline */}
            <div className="h-[500px]">
              <ActivityTimeline />
            </div>
          </div>
          
          {/* Optional Help Section */}
          <div className="mt-8">
            <div className="terminal rounded-lg p-6 overflow-hidden">
              <h3 className="text-lg font-bold text-green-500 font-mono mb-4">&gt; HELP_CENTER</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <a href="/docs/credentials" className="p-3 bg-black/50 border border-green-500/30 rounded hover:border-green-500/50 transition-colors">
                  <p className="text-xs font-mono text-green-400 mb-1">CREDENTIAL_GUIDE</p>
                  <p className="text-xs font-mono text-green-300">// Learn about VCs</p>
                </a>
                <a href="/docs/authorization" className="p-3 bg-black/50 border border-green-500/30 rounded hover:border-green-500/50 transition-colors">
                  <p className="text-xs font-mono text-green-400 mb-1">AUTH_FLOW</p>
                  <p className="text-xs font-mono text-green-300">// DID integration</p>
                </a>
                <a href="/support" className="p-3 bg-black/50 border border-green-500/30 rounded hover:border-green-500/50 transition-colors">
                  <p className="text-xs font-mono text-green-400 mb-1">CONTACT_SUPPORT</p>
                  <p className="text-xs font-mono text-green-300">// Get help</p>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* VC Modal */}
      </div>
    </Layout>
  )
}