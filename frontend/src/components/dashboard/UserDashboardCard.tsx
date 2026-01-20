'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Trophy, Coins, CheckCircle, Clock, XCircle, Wallet, CalendarCheck } from '@phosphor-icons/react'
import { useCheckInX402 } from '@/application/hooks/useCheckInX402'
import { useCheckInSummary } from '@/application/hooks/useAuth'
import { X402PaymentModal } from '@/components/X402PaymentModal'
import toast from 'react-hot-toast'

export function UserDashboardCard() {
  const {
    checkIn,
    verifyPayment,
    startPolling,
    stopPolling,
    loading,
    challenge,
    error,
    success,
    alreadyCheckedIn,
    isPolling,
    nextPollTime,
  } = useCheckInX402()

  const { data: summary, refetch: refetchSummary, isLoading: summaryLoading } = useCheckInSummary()
  const [isModalOpen, setIsModalOpen] = useState(false)
  console.log('summary', summary)

  // When payment challenge is received, open modal
  useEffect(() => {
    if (challenge) {
      setIsModalOpen(true)
    }
  }, [challenge])

  // When check-in succeeds, refresh list and show notification
  useEffect(() => {
    if (success && !challenge) {
      toast.success('Check-in successful! Token distribution in progress...')
      setIsModalOpen(false)
      setTimeout(() => {
        refetchSummary()
      }, 1000)
    }
  }, [success, challenge, refetchSummary])

  // Show error notification
  useEffect(() => {
    if (error && !challenge) {
      toast.error(error)
    }
  }, [error, challenge])

  // Use summary API to check if already checked in today
  const hasCheckedInToday = alreadyCheckedIn

  // Format total rewards - remove unnecessary decimal zeros
  const formatRewards = (rewardsStr?: string) => {
    if (!rewardsStr) return '0'
    try {
      const rewards = parseFloat(rewardsStr)
      // If it's an integer, show without decimals
      if (Number.isInteger(rewards)) {
        return rewards.toString()
      }
      // Otherwise show up to 2 decimal places, removing trailing zeros
      return rewards.toFixed(2).replace(/\.?0+$/, '')
    } catch {
      return '0'
    }
  }

  const handleCheckIn = async () => {
    if (hasCheckedInToday) {
      toast.error('Already checked in today')
      return
    }

    await checkIn()
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    stopPolling()
  }

  const handleManualVerify = async () => {
    if (challenge?.order_id) {
      await verifyPayment(challenge.order_id)
    }
  }

  return (
    <>
      <div className="terminal rounded-lg p-6 h-full flex flex-col">
        {/* Check-in Section - Priority */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-bold text-green-500 font-mono">&gt; DAILY_CHECK_IN</h3>
            <div className="bg-green-500/20 border border-green-500 rounded px-2 py-1">
              <span className="text-green-500 font-mono font-bold text-xs">X402</span>
            </div>
          </div>

          {/* Reward Info - Two columns */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="text-green-400" size={18} />
                <span className="text-xs font-mono text-green-400 uppercase">Reward</span>
              </div>
              <div className="text-3xl font-bold text-green-500 font-mono">
                10 <span className="text-green-400 text-lg">DDATA</span>
              </div>
            </div>

            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="text-green-400" size={18} />
                <span className="text-xs font-mono text-green-400 uppercase">Cost</span>
              </div>
              <div className="text-3xl font-bold text-green-500 font-mono">
                0.01 <span className="text-green-400 text-lg">USDT</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div>
            {hasCheckedInToday ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 border border-green-500 text-green-500 rounded-xl font-mono text-sm">
                <CheckCircle size={20} weight="fill" />
                <span>CHECKED IN TODAY</span>
              </div>
            ) : loading ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/20 border border-yellow-500 text-yellow-500 rounded-xl font-mono text-sm">
                <Clock className="animate-spin" size={20} />
                <span>PENDING...</span>
              </div>
            ) : error ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 border border-red-500 text-red-500 rounded-xl font-mono text-sm">
                <XCircle size={20} weight="fill" />
                <span>FAILED</span>
              </div>
            ) : loading ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/20 border border-yellow-500 text-yellow-500 rounded-xl font-mono text-sm">
                <Clock className="animate-spin" size={20} />
                <span>PROCESSING...</span>
              </div>
            ) : (
              <Button
                onClick={handleCheckIn}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-400 text-black px-6 py-3 font-mono font-bold transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <CalendarCheck size={20} weight="bold" />
                CHECK IN NOW
              </Button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-green-500/20 my-6"></div>

        {/* Stats Section */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-yellow-400" size={18} />
            <h3 className="text-lg font-bold text-green-500 font-mono">&gt; YOUR_STATS</h3>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Total Earned */}
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg hover:border-green-500/40 transition-colors">
              <div className="flex items-center justify-center mb-2">
                <Coins className="text-green-400" size={20} />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500 font-mono mb-1">
                  {summaryLoading ? <span className="text-green-500/60">&gt;_</span> : formatRewards(summary?.totalRewards)}
                </div>
                <span className="text-green-400/80 text-xs font-mono block">EARNED</span>
              </div>
            </div>

            {/* Total Check-ins */}
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg hover:border-green-500/40 transition-colors">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="text-green-400" size={20} />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500 font-mono mb-1">
                  {summaryLoading ? <span className="text-green-500/60">&gt;_</span> : (summary?.totalCheckins || 0)}
                </div>
                <span className="text-green-400/80 text-xs font-mono block">CHECKINS</span>
              </div>
            </div>

            {/* Global Rank */}
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg hover:border-green-500/40 transition-colors">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="text-yellow-400" size={20} />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 font-mono mb-1">
                  {summaryLoading ? <span className="text-yellow-500/60">&gt;_</span> : (summary?.rank ? `#${summary.rank}` : '#N/A')}
                </div>
                <span className="text-yellow-400/80 text-xs font-mono block">RANK</span>
              </div>
            </div>
          </div>

          {/* Info Text */}
          <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded">
            <p className="text-xs text-green-400/80 font-mono text-center">
              &gt; Complete daily check-ins to earn DDATA tokens
            </p>
          </div>
        </div>
      </div>

      {/* X402 Payment Modal */}
      <X402PaymentModal
        challenge={challenge}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPaymentConfirmed={handleManualVerify}
        onStartPolling={startPolling}
        isPolling={isPolling}
        nextPollTime={nextPollTime}
        error={error}
        loading={loading}
      />
    </>
  )
}
