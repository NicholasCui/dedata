'use client'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { useLeaderboard } from '@/application/hooks/useLeaderboard'
import { Medal, Crown, Star } from '@phosphor-icons/react'
import { useState } from 'react'

export default function LeaderboardPage() {
  const [page, setPage] = useState(1)
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useLeaderboard({ page, limit: 20 })

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-500" size={20} />
    if (rank === 2) return <Medal className="text-gray-400" size={20} />
    if (rank === 3) return <Star className="text-amber-600" size={20} />
    return (
      <span className="text-sm font-bold font-mono text-green-400">
        #{rank}
      </span>
    )
  }

  const formatTokens = (amount: string) => {
    try {
      const tokens = BigInt(amount) / BigInt(10 ** 18)
      return `${tokens.toString()} DDATA`
    } catch {
      return '0 DDATA'
    }
  }

  return (
    <div className="min-h-screen bg-black matrix-bg">
      <Layout>
        <div className="space-y-8">
          {/* Header Terminal */}
          <div className="terminal rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500 text-sm ml-4 font-mono">
                ~/leaderboard $
              </span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <div>
                <h1 className="text-2xl font-bold text-green-500 mb-2">
                  &gt; GLOBAL_RANKINGS
                </h1>
                <p className="text-green-400 text-sm">
                  {
                    '// Participants ranked by activity participation and rewards earned'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard Terminal */}
          <div className="terminal rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500 text-sm ml-4 font-mono">
                global_ranking.db
              </span>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-green-400 font-mono text-sm animate-pulse">
                    &gt; LOADING_RANKING_DATA
                    <span className="animate-terminal-cursor ml-1">_</span>
                  </p>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-red-400 font-mono text-sm">
                    &gt; ERROR_LOADING_DATA
                  </p>
                </div>
              ) : leaderboardData?.data.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-green-400 font-mono text-sm">
                    &gt; NO_USERS_FOUND
                  </p>
                </div>
              ) : (
                leaderboardData?.data.map((user, index) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded border scan-line hover:border-green-400 transition-all ${
                      user.isMe
                        ? 'bg-green-500/10 border-green-500'
                        : 'bg-black/50 border-green-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-8">
                         {getRankIcon(user.rank)}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-green-500/20 border border-green-500 flex items-center justify-center">
                          <span className="text-green-500 font-mono font-bold">
                            {user.displayName?.[0]?.toUpperCase() ||
                              user.walletAddress.slice(2, 4).toUpperCase()}
                          </span>
                        </div>
                        <div className="font-mono">
                          <div className="font-semibold text-green-500">
                            {user.displayName ||
                              `${user.walletAddress.slice(
                                0,
                                6
                              )}...${user.walletAddress.slice(-4)}`}
                          </div>
                          <div className="text-sm text-green-400">
                            {user.walletAddress.slice(0, 10)}...
                          </div>
                        </div>
                        {user.isMe && (
                          <span className="px-2 py-1 bg-green-500 text-black text-xs font-mono font-bold rounded">
                            SELF
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center font-mono">
                        <div className="text-xs text-green-400 mb-1">
                          CHECK-INS
                        </div>
                        <div className="font-bold text-green-500">
                            {user.totalCheckins}
                        </div>
                      </div>
                      <div className="text-center font-mono">
                        <div className="text-xs text-green-400 mb-1">
                          REWARDS
                        </div>
                        <div className="font-bold text-green-500">
                            {formatTokens(user.totalRewards)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {leaderboardData && leaderboardData.pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-4">
                <Button
                  variant="outline"
                  className="border-green-500 text-green-500 hover:bg-green-500/10 font-mono"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1 || isLoading}
                >
                  PREVIOUS_PAGE
                </Button>
                <span className="px-4 py-2 text-green-400 font-mono text-sm">
                  {page} / {leaderboardData.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  className="border-green-500 text-green-500 hover:bg-green-500/10 font-mono"
                  onClick={() =>
                    setPage(
                      Math.min(leaderboardData.pagination.totalPages, page + 1)
                    )
                  }
                  disabled={
                    page === leaderboardData.pagination.totalPages || isLoading
                  }
                >
                  NEXT_PAGE
                </Button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </div>
  )
}
