'use client'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { 
  Users, 
  Coins, 
  Terminal, 
  Shield, 
  ArrowRight,
  Lightning,
  Check,
  Warning,
  Prohibit,
  UserCheck,
  MagnifyingGlass,
  Export,
  Plus,
  X,
  Eye,
  PaperPlaneRight,
  Download,
  WarningCircle
} from '@phosphor-icons/react'
import { useState } from 'react'

// Mock data
const systemStats = {
  totalUsers: 12450,
  activeUsers: 8920,
  blacklistedUsers: 23,
  totalRewards: '5,245 ETH',
  pendingRewards: '125 ETH',
  totalActivities: 15780,
  recentActivities: 245,
  systemHealth: 98.5,
  lastSync: '2024-01-15 10:30:45'
}

// More detailed user data
const allUsers = [
  { address: '0x1234...5678', ens: 'alice.eth', joinDate: '2024-01-15', status: 'active', points: 2450, rewards: '245 ETH', activities: 58 },
  { address: '0x2345...6789', ens: 'bob.eth', joinDate: '2024-01-14', status: 'active', points: 1850, rewards: '185 ETH', activities: 45 },
  { address: '0x3456...7890', ens: null, joinDate: '2024-01-13', status: 'blacklisted', points: 0, rewards: '0 ETH', activities: 0 },
  { address: '0x4567...8901', ens: 'charlie.eth', joinDate: '2024-01-12', status: 'active', points: 1650, rewards: '165 ETH', activities: 38 },
  { address: '0x5678...9012', ens: 'david.eth', joinDate: '2024-01-11', status: 'pending', points: 320, rewards: '32 ETH', activities: 8 },
]

// Reward history data
const rewardHistory = [
  { id: 1, user: 'alice.eth', amount: '24.5 ETH', activities: 58, status: 'completed', date: '2024-01-15', txHash: '0xabc...123' },
  { id: 2, user: 'bob.eth', amount: '18.2 ETH', activities: 45, status: 'processing', date: '2024-01-14', txHash: null },
  { id: 3, user: 'charlie.eth', amount: '15.8 ETH', activities: 38, status: 'completed', date: '2024-01-13', txHash: '0xdef...456' },
  { id: 4, user: 'david.eth', amount: '12.3 ETH', activities: 28, status: 'failed', date: '2024-01-12', txHash: null, error: 'Insufficient gas' },
  { id: 5, user: 'eve.eth', amount: '8.5 ETH', activities: 18, status: 'pending', date: '2024-01-11', txHash: null },
]

export default function AdminPage() {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [rewardSearchQuery, setRewardSearchQuery] = useState('')
  const [showManualReward, setShowManualReward] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  // Filter users
  const filteredUsers = allUsers.filter(user => 
    user.ens?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.address.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  // Filter reward history
  const filteredRewards = rewardHistory.filter(reward =>
    reward.user.toLowerCase().includes(rewardSearchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-black matrix-bg">
      <Layout isAdmin>
        <div className="space-y-8">
          {/* Header Terminal */}
          <div className="terminal rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-500 text-sm ml-4 font-mono">~/admin $</span>
            </div>
            <div className="font-mono">
              <h1 className="text-2xl font-bold text-green-500 mb-2">&gt; ADMIN_CONSOLE</h1>
              <p className="text-green-400 text-sm">{'// System administration and management interface'}</p>
            </div>
          </div>

          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="terminal rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Users className="text-green-500" size={24} />
                <span className="text-xs text-green-400 font-mono">+5.2%</span>
              </div>
              <div className="font-mono">
                <div className="text-2xl font-bold text-green-500">{systemStats.totalUsers.toLocaleString()}</div>
                <div className="text-xs text-green-400">TOTAL_USERS</div>
                <div className="text-xs text-red-400 mt-1">{systemStats.blacklistedUsers} blacklisted</div>
              </div>
            </div>

            <div className="terminal rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Coins className="text-green-500" size={24} />
                <span className="text-xs text-yellow-400 font-mono">PENDING</span>
              </div>
              <div className="font-mono">
                <div className="text-2xl font-bold text-green-500">{systemStats.totalRewards}</div>
                <div className="text-xs text-green-400">TOTAL_REWARDS</div>
                <div className="text-xs text-yellow-400 mt-1">{systemStats.pendingRewards} pending</div>
              </div>
            </div>

            <div className="terminal rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Lightning className="text-green-500" size={24} />
                <span className="text-xs text-green-400 font-mono">+12.8%</span>
              </div>
              <div className="font-mono">
                <div className="text-2xl font-bold text-green-500">{systemStats.totalActivities.toLocaleString()}</div>
                <div className="text-xs text-green-400">ACTIVITIES</div>
              </div>
            </div>

            <div className="terminal rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Shield className="text-green-500" size={24} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="font-mono">
                <div className="text-2xl font-bold text-green-500">{systemStats.systemHealth}%</div>
                <div className="text-xs text-green-400">SYSTEM_HEALTH</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-green-500/30">
            {['overview', 'users', 'rewards'].map((tab) => (
              <button
                key={tab}
                data-tab={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-3 font-mono font-medium transition-all ${
                  selectedTab === tab
                    ? 'text-green-400 border-b-2 border-green-500'
                    : 'text-green-500 hover:text-green-400'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Content based on selected tab */}
          {selectedTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <div className="terminal rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-500 font-mono">&gt; RECENT_USERS</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-green-500 hover:text-green-400"
                    onClick={() => setSelectedTab('users')}
                  >
                    VIEW_ALL <ArrowRight className="ml-1" size={14} />
                  </Button>
                </div>
                <div className="space-y-3">
                  {allUsers.slice(0, 3).map((user) => (
                    <div key={user.address} className="flex items-center justify-between p-3 bg-black/50 border border-green-500/30 rounded">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-green-500/20 border border-green-500 flex items-center justify-center">
                          <span className="text-green-500 text-xs font-mono font-bold">
                            {user.ens ? user.ens[0].toUpperCase() : user.address.slice(2, 4).toUpperCase()}
                          </span>
                        </div>
                        <div className="font-mono">
                          <div className="text-sm text-green-500">{user.ens || user.address}</div>
                          <div className="text-xs text-green-400">Joined: {user.joinDate}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-mono rounded ${
                        user.status === 'active' 
                          ? 'bg-green-500/20 text-green-500'
                          : user.status === 'blacklisted'
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {user.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Rewards */}
              <div className="terminal rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-500 font-mono">&gt; RECENT_REWARDS</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-green-500 hover:text-green-400"
                    onClick={() => setSelectedTab('rewards')}
                  >
                    VIEW_ALL <ArrowRight className="ml-1" size={14} />
                  </Button>
                </div>
                <div className="space-y-3">
                  {rewardHistory.slice(0, 3).map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 bg-black/50 border border-green-500/30 rounded">
                      <div className="flex-1 font-mono">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-green-500">{reward.user}</span>
                          <span className="text-xs text-green-400">• {reward.activities} activities</span>
                        </div>
                        <div className="text-xs text-green-400">{reward.date}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-green-500 font-mono">{reward.amount}</span>
                        <div className={`w-2 h-2 rounded-full ${
                          reward.status === 'completed' ? 'bg-green-500' :
                          reward.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                          reward.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`} title={reward.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'users' && (
            <div className="space-y-6">
              {/* User Management Header */}
              <div className="terminal rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-green-500 font-mono">&gt; USER_MANAGEMENT</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10">
                      <Export className="mr-2" size={16} />
                      EXPORT
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400" size={20} />
                  <input
                    type="text"
                    placeholder="SEARCH_USER_ADDRESS_OR_ENS..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black border border-green-500/50 rounded text-green-500 font-mono placeholder-green-400/50 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* User List */}
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.address} className="flex items-center justify-between p-4 bg-black/50 border border-green-500/30 rounded hover:border-green-400 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded bg-green-500/20 border border-green-500 flex items-center justify-center">
                          <span className="text-green-500 font-mono font-bold">
                            {user.ens ? user.ens[0].toUpperCase() : user.address.slice(2, 4).toUpperCase()}
                          </span>
                        </div>
                        <div className="font-mono">
                          <div className="font-semibold text-green-500">{user.ens || user.address}</div>
                          <div className="text-xs text-green-400">
                            Points: {user.points} | Rewards: {user.rewards} | Activities: {user.activities}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-mono rounded ${
                          user.status === 'active' 
                            ? 'bg-green-500/20 text-green-500'
                            : user.status === 'blacklisted'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {user.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-500 hover:text-green-400"
                        >
                          <Eye size={16} />
                        </Button>
                        {user.status === 'active' ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-400"
                          >
                            <Prohibit size={16} />
                          </Button>
                        ) : user.status === 'blacklisted' ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-500 hover:text-green-400"
                          >
                            <UserCheck size={16} />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {/* User Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-black/50 border border-green-500/30 rounded p-4 text-center">
                    <p className="text-2xl font-bold text-green-500 font-mono">{systemStats.activeUsers}</p>
                    <p className="text-xs text-green-400 font-mono">ACTIVE USERS</p>
                  </div>
                  <div className="bg-black/50 border border-yellow-500/30 rounded p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-500 font-mono">5</p>
                    <p className="text-xs text-green-400 font-mono">PENDING USERS</p>
                  </div>
                  <div className="bg-black/50 border border-red-500/30 rounded p-4 text-center">
                    <p className="text-2xl font-bold text-red-500 font-mono">{systemStats.blacklistedUsers}</p>
                    <p className="text-xs text-green-400 font-mono">BLACKLISTED</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'rewards' && (
            <div className="space-y-6">
              {/* Rewards Management Header */}
              <div className="terminal rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-green-500 font-mono">&gt; REWARD_MANAGEMENT</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="border-green-500 text-green-500 hover:bg-green-500/10"
                      onClick={() => setShowManualReward(true)}
                    >
                      <Plus className="mr-2" size={16} />
                      MANUAL_SEND
                    </Button>
                    <Button className="bg-green-500 hover:bg-green-400 text-black">
                      <PaperPlaneRight className="mr-2" size={16} />
                      BATCH_PROCESS
                    </Button>
                  </div>
                </div>

                {/* Reward Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-black/50 border border-green-500/30 rounded p-4">
                    <Coins className="text-green-500 mb-2" size={24} />
                    <p className="text-lg font-bold text-green-500 font-mono">{systemStats.totalRewards}</p>
                    <p className="text-xs text-green-400 font-mono">Total Distributed</p>
                  </div>
                  <div className="bg-black/50 border border-yellow-500/30 rounded p-4">
                    <Warning className="text-yellow-500 mb-2" size={24} />
                    <p className="text-lg font-bold text-yellow-500 font-mono">{systemStats.pendingRewards}</p>
                    <p className="text-xs text-green-400 font-mono">Pending</p>
                  </div>
                  <div className="bg-black/50 border border-green-500/30 rounded p-4">
                    <Check className="text-green-500 mb-2" size={24} />
                    <p className="text-lg font-bold text-green-500 font-mono">1,245</p>
                    <p className="text-xs text-green-400 font-mono">Completed</p>
                  </div>
                  <div className="bg-black/50 border border-red-500/30 rounded p-4">
                    <X className="text-red-500 mb-2" size={24} />
                    <p className="text-lg font-bold text-red-500 font-mono">12</p>
                    <p className="text-xs text-green-400 font-mono">Failed</p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400" size={20} />
                  <input
                    type="text"
                    placeholder="SEARCH_USER_OR_TX_HASH..."
                    value={rewardSearchQuery}
                    onChange={(e) => setRewardSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-black border border-green-500/50 rounded text-green-500 font-mono placeholder-green-400/50 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Rewards History */}
                <div className="space-y-3">
                  {filteredRewards.map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-4 bg-black/50 border border-green-500/30 rounded hover:border-green-400 transition-all">
                      <div className="flex-1 font-mono">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-green-500">{reward.user}</span>
                          <span className="text-xs text-green-400">• {reward.activities} activities</span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            reward.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                            reward.status === 'processing' ? 'bg-yellow-500/20 text-yellow-500' :
                            reward.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            {reward.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-green-400">
                          <span>Date: {reward.date}</span>
                          {reward.txHash && <span>TX: {reward.txHash}</span>}
                          {reward.error && <span className="text-red-400">Error: {reward.error}</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-green-500 font-mono">{reward.amount}</span>
                        <div className="flex gap-2">
                          {reward.status === 'pending' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-500 hover:text-green-400"
                            >
                              <PaperPlaneRight size={16} />
                            </Button>
                          )}
                          {reward.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-yellow-500 hover:text-yellow-400"
                            >
                              <WarningCircle size={16} />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-500 hover:text-green-400"
                          >
                            <Eye size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Export Button */}
                <div className="mt-6 text-center">
                  <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10">
                    <Download className="mr-2" size={16} />
                    EXPORT_HISTORY
                  </Button>
                </div>
              </div>

              {/* Manual Reward Modal (Simple) */}
              {showManualReward && (
                <div className="terminal rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-green-500 font-mono">&gt; MANUAL_REWARD_DISTRIBUTION</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-400"
                      onClick={() => setShowManualReward(false)}
                    >
                      <X size={20} />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-green-400 font-mono text-sm">USER_ADDRESS</label>
                      <input
                        type="text"
                        placeholder="0x..."
                        className="w-full mt-1 px-4 py-2 bg-black border border-green-500/50 rounded text-green-500 font-mono placeholder-green-400/50 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-green-400 font-mono text-sm">REWARD_AMOUNT (ETH)</label>
                      <input
                        type="text"
                        placeholder="0.0"
                        className="w-full mt-1 px-4 py-2 bg-black border border-green-500/50 rounded text-green-500 font-mono placeholder-green-400/50 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-green-400 font-mono text-sm">REASON</label>
                      <input
                        type="text"
                        placeholder="Manual reward for..."
                        className="w-full mt-1 px-4 py-2 bg-black border border-green-500/50 rounded text-green-500 font-mono placeholder-green-400/50 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        className="border-green-500 text-green-500 hover:bg-green-500/10"
                        onClick={() => setShowManualReward(false)}
                      >
                        CANCEL
                      </Button>
                      <Button className="bg-green-500 hover:bg-green-400 text-black">
                        <PaperPlaneRight className="mr-2" size={16} />
                        SEND_REWARD
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* System Status */}
          <div className="terminal rounded-lg p-4">
            <div className="flex items-center justify-between font-mono text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400">SYSTEM_ONLINE</span>
                </div>
                <span className="text-green-500">|</span>
                <span className="text-green-400">Last sync: {systemStats.lastSync}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-green-400">Health: {systemStats.systemHealth}%</span>
                <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-400">
                  <Terminal size={16} className="mr-1" />
                  CONSOLE
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </div>
  )
}