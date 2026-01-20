/* eslint-disable react/jsx-no-comment-textnodes */
'use client'

import { useState } from 'react'
import {
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Coins,
  Wallet,
  ArrowSquareOut,
  Copy
} from '@phosphor-icons/react'
import { useMyCheckInList } from '@/application/hooks/useAuth'
import { CheckInRecord, CheckInStatus } from '@/infrastructure/api/endpoints/checkins'
import toast from 'react-hot-toast'

const getStatusConfig = (status: CheckInStatus) => {
  const configs = {
    success: {
      icon: CheckCircle,
      label: 'SUCCESS',
      color: 'green',
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-500',
      borderClass: 'border-green-500'
    },
    issuing: {
      icon: Clock,
      label: 'ISSUING',
      color: 'yellow',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-500',
      borderClass: 'border-yellow-500'
    },
    payment_success: {
      icon: CheckCircle,
      label: 'PAID',
      color: 'blue',
      bgClass: 'bg-blue-500/20',
      textClass: 'text-blue-500',
      borderClass: 'border-blue-500'
    },
    pending_payment: {
      icon: Wallet,
      label: 'PENDING',
      color: 'yellow',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-500',
      borderClass: 'border-yellow-500'
    },
    payment_failed: {
      icon: XCircle,
      label: 'PAYMENT FAILED',
      color: 'red',
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-500',
      borderClass: 'border-red-500'
    },
    issue_failed: {
      icon: Warning,
      label: 'ISSUE FAILED',
      color: 'red',
      bgClass: 'bg-red-500/20',
      textClass: 'text-red-500',
      borderClass: 'border-red-500'
    }
  }
  return configs[status] || configs.pending_payment
}

export function ActivityTimeline() {
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading } = useMyCheckInList({ page, pageSize })

  const copyTxHash = (txHash: string) => {
    navigator.clipboard.writeText(txHash)
    toast.success('Transaction hash copied')
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    }
  }

  const formatTokenAmount = (amount?: string) => {
    if (!amount) return '0'
    try {
      return parseFloat(amount).toFixed(2)
    } catch {
      return '0'
    }
  }

  const getBlockchainScanUrl = (txHash: string, blockchain?: string) => {
    const urls: Record<string, string> = {
      'Polygon': 'https://polygonscan.com/tx/',
      'Ethereum': 'https://etherscan.io/tx/',
    }
    const baseUrl = blockchain && urls[blockchain] ? urls[blockchain] : urls['Polygon']
    return `${baseUrl}${txHash}`
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1

  if (isLoading) {
    return (
      <div className="terminal rounded-lg p-6 h-full flex flex-col">
        <div className="shrink-0">
          <h3 className="text-lg font-bold text-green-500 font-mono mb-4">&gt; ACTIVITY_LOG</h3>
        </div>
        <div className="flex-1 animate-pulse space-y-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 bg-green-500/5 border border-green-500/20 rounded">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-green-500/20 rounded"></div>
                <div className="h-4 bg-green-500/20 rounded w-1/3"></div>
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-green-500/20 rounded w-1/2"></div>
                <div className="h-3 bg-green-500/20 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="terminal rounded-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-lg font-bold text-green-500 font-mono">&gt; ACTIVITY_LOG</h3>
        <span className="text-xs font-mono text-green-400">[RECENT]</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-3">
          {data?.list && data.list.length > 0 ? (
            data.list.map((record: CheckInRecord) => {
              const statusConfig = getStatusConfig(record.status)
              const StatusIcon = statusConfig.icon
              const dateTime = formatDateTime(record.createdAt)

              return (
                <div
                  key={record.id}
                  className="p-4 bg-black/30 border border-green-500/20 rounded hover:bg-green-500/5 hover:border-green-500/30 transition-all duration-200"
                >
                  {/* Header Row - Icon, Type, Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${statusConfig.bgClass}`}>
                        <StatusIcon size={18} className={statusConfig.textClass} />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-green-400">
                          DAILY CHECK-IN
                        </p>
                        <p className="font-mono text-xs text-green-300">
                          {dateTime.date} at {dateTime.time}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-mono font-bold ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                      {statusConfig.label}
                    </div>
                  </div>

                  {/* Token Amount */}
                  {record.tokenAmount && (
                    <div className="flex items-center gap-2 mb-3">
                      <Coins size={14} className="text-green-400" />
                      <span className="text-sm font-mono font-bold text-green-500">
                        +{formatTokenAmount(record.tokenAmount)} DDATA
                      </span>
                    </div>
                  )}

                  {/* Payment Info */}
                  {record.status === 'pending_payment' && record.priceAmount && (
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded mb-3">
                      <p className="text-xs font-mono text-yellow-400">
                        Payment required: {record.priceAmount} {record.tokenSymbol}
                      </p>
                    </div>
                  )}

                  {/* Failure Reason */}
                  {record.failureReason && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded mb-3">
                      <p className="text-xs font-mono text-red-400">
                        {record.failureReason}
                      </p>
                    </div>
                  )}

                  {/* Transaction Hash */}
                  {record.issueTxHash && (
                    <div className="pt-3 border-t border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-green-400">TX:</span>
                          <code className="text-xs font-mono text-green-300 bg-black/50 px-2 py-1 rounded">
                            {record.issueTxHash.slice(0, 8)}...{record.issueTxHash.slice(-6)}
                          </code>
                          <button
                            onClick={() => copyTxHash(record.issueTxHash!)}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            title="Copy transaction hash"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <a
                          href={getBlockchainScanUrl(record.issueTxHash, record.blockchainName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 rounded hover:border-yellow-500/50 transition-all"
                        >
                          VIEW
                          <ArrowSquareOut size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-sm font-mono text-green-400">No check-in records yet</p>
              <p className="text-xs font-mono text-green-300 mt-1">// Start checking in to see activity</p>
            </div>
          )}
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-500/20 shrink-0">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-xs font-mono text-green-400 hover:text-green-500 border border-green-500/30 rounded hover:border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            &lt; PREV
          </button>
          <span className="text-xs font-mono text-green-500">
            [{page}/{totalPages}]
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-xs font-mono text-green-400 hover:text-green-500 border border-green-500/30 rounded hover:border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            NEXT &gt;
          </button>
        </div>
      )}
    </div>
  )
}