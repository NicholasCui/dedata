'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, XCircle, X, ArrowClockwise } from '@phosphor-icons/react'
import { useRecentPayouts } from '@/application/hooks/useAuth'
import toast from 'react-hot-toast'

interface PayoutStatus {
  id: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  message: string
  txHash?: string
  retryCount?: number
  createdAt: string
}

export function PayoutStatusBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const { data: payouts, refetch } = useRecentPayouts({ limit: 1 })
  
  const latestPayout = payouts?.[0] as PayoutStatus | undefined
  
  // Auto-hide after success
  useEffect(() => {
    if (latestPayout?.status === 'SUCCESS') {
      const timer = setTimeout(() => setIsVisible(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [latestPayout?.status])
  
  const handleRetry = async () => {
    if (!latestPayout?.id) return
    
    try {
      const response = await fetch(`/api/checkins/${latestPayout.id}/retry`, {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Retry initiated successfully')
        refetch()
      } else {
        toast.error('Retry failed')
      }
    } catch (error) {
      toast.error('Network error')
    }
  }
  
  if (!latestPayout || !isVisible) return null
  
  const statusConfig = {
    PENDING: {
      icon: Clock,
      iconClass: 'text-yellow-500 animate-spin',
      bgClass: 'bg-yellow-500/10 border-yellow-500/30',
      textClass: 'text-yellow-500',
      message: 'PROCESSING...'
    },
    SUCCESS: {
      icon: CheckCircle,
      iconClass: 'text-green-500',
      bgClass: 'bg-green-500/10 border-green-500/30',
      textClass: 'text-green-500',
      message: 'DISTRIBUTION_SUCCESS'
    },
    FAILED: {
      icon: XCircle,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-500/10 border-red-500/30',
      textClass: 'text-red-500',
      message: 'DISTRIBUTION_FAILED'
    }
  }
  
  const config = statusConfig[latestPayout.status]
  const Icon = config.icon
  
  return (
    <div className={`${config.bgClass} border rounded-2xl p-4 mb-6 backdrop-blur-sm shadow-sm terminal`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${config.bgClass}`}>
            <Icon className={config.iconClass} size={20} weight="fill" />
          </div>
          <div>
            <p className={`${config.textClass} font-bold font-mono text-sm`}>
              [{config.message}]
            </p>
            <p className="text-xs font-mono text-green-300 mt-1">
              {latestPayout.message}
              {latestPayout.retryCount && latestPayout.retryCount > 0 && (
                <span className="ml-2">
                  (RETRY: {latestPayout.retryCount}/3)
                </span>
              )}
            </p>
            {latestPayout.txHash && (
              <a
                href={`https://explorer.solana.com/tx/${latestPayout.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-yellow-400 hover:text-yellow-300 mt-1 inline-block"
              >
                VIEW_ON_SOLANA &gt;
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {latestPayout.status === 'FAILED' && (
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-red-500 text-black rounded font-mono text-xs font-bold hover:bg-red-400 transition-colors flex items-center gap-1"
            >
              <ArrowClockwise size={14} />
              RETRY
            </button>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}