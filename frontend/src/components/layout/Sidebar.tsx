'use client'

import { ReactNode } from 'react'
import { Wallet, ChartBar, Trophy, Users, Gear, Key, Target, Sparkle, Terminal, Database, Buildings, Shield, CurrencyCircleDollar } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const userNavItems = [
  { icon: ChartBar, label: 'METRICS_PANEL', href: '/dashboard' },
  { icon: Trophy, label: 'LEADERBOARD', href: '/leaderboard' },
  { icon: CurrencyCircleDollar, label: 'X402_PROTOCOL', href: '/dashboard/x402' },
]

const orgOwnerNavItems = [
  { icon: ChartBar, label: 'ORG_DASHBOARD', href: '/org/dashboard' },
  { icon: Buildings, label: 'ORG_MANAGEMENT', href: '/org/management' },
  { icon: Users, label: 'MEMBERS', href: '/org/members' },
  { icon: Shield, label: 'PERMISSIONS', href: '/org/permissions' },
  { icon: Target, label: 'ANALYTICS', href: '/org/analytics' },
]

interface SidebarProps {
  isAdmin?: boolean
  isOrgOwner?: boolean
}

export function Sidebar({ isAdmin = false, isOrgOwner = false }: SidebarProps) {
  const pathname = usePathname()
  
  // Admin 页面不显示侧边栏导航
  if (isAdmin) {
    return null
  }
  
  let navItems = userNavItems
  if (isOrgOwner) {
    navItems = orgOwnerNavItems
  }

  return (
    <div className="flex h-full w-64 flex-col bg-black border-r border-green-500/30 shadow-lg shadow-green-500/20">
      {/* Terminal Header */}
      <div className="terminal rounded-none border-t-0 border-l-0 border-r-0 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-green-500 text-sm ml-4 font-mono">navigation.sh</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded bg-green-500/20 border border-green-500 flex items-center justify-center">
              <Terminal className="text-green-500" size={20} />
            </div>
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="font-mono">
            <span className="text-xl font-bold text-green-500">DeData</span>
            <div className="text-xs text-green-400">PROTOCOL_v1.0</div>
          </div>
        </div>
      </div>
      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <div key={item.href} className="scan-line">
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 text-sm font-mono font-medium rounded transition-all duration-200 relative overflow-hidden hover:border-green-400",
                    isActive
                      ? "bg-green-500/20 text-green-400 border border-green-500"
                      : "text-green-500 hover:bg-green-500/10 border border-green-500/30"
                  )}
                >
                  <Icon 
                    size={20} 
                    weight={isActive ? "fill" : "regular"}
                    className="relative z-10"
                  />
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </Link>
              </div>
            )
          })}
        </div>
      </nav>
    </div>
  )
}