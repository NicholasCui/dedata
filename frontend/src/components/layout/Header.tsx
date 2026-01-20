'use client'

import {
  SignOut,
  Gear,
  Terminal,
  CurrencyCircleDollar,
  ArrowsLeftRight,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react'
import { TransferModal } from '@/components/TransferModal'
import { SwapModal } from '@/components/SwapModal'
import { useLogout } from '@/application/hooks/useAuth'
import { useTokenBalance } from '@/application/hooks/useTokenBalance'
import toast from 'react-hot-toast'

interface HeaderProps {
  user?: {
    address: string
    avatar?: string
    ens?: string
  }
}

export function Header({ user: _user }: HeaderProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const logoutMutation = useLogout()
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showVCModal, setShowVCModal] = useState(false)

  // Get real-time token balance from blockchain
  const {
    balanceFormatted,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useTokenBalance()

  // Format DID according to CAIP-10 standard (did:pkh:eip155:137:address)
  const formatDID = (address: string) => {
    const did = `did:pkh:eip155:137:${address}`
    // Shorten for display: did:pkh:...xxxxx
    if (did.length > 30) {
      const parts = did.split(':')
      if (parts.length >= 5) {
        const shortAddress =
          parts[4].length > 10
            ? `${parts[4].slice(0, 6)}...${parts[4].slice(-4)}`
            : parts[4]
        return `did:pkh:137:${shortAddress}`
      }
    }
    return did
  }

  // Get balance from blockchain (real-time balance)
  const balance = balanceFormatted || '0'

  // Balance is already formatted from the hook
  const displayBalance = balance

  // Handle logout - both disconnect wallet and clear session
  const handleLogout = async () => {
    try {
      // First call backend logout to clear session
      await logoutMutation.mutateAsync()
      // Then disconnect wallet
      disconnect()
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      // Still disconnect wallet even if backend logout fails
      disconnect()
      toast.error('Logout completed (with errors)')
    }
  }

  return (
    <>
      <header className="h-20 bg-black/80 backdrop-blur-xl border-b border-green-500/30">
        <div className="h-full px-8 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded bg-green-500/20 border border-green-500 flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                <Terminal className="text-green-500" size={20} />
              </div>
              <div className="font-mono">
                <div className="text-lg font-bold text-green-500 group-hover:text-green-400 transition-colors leading-tight">
                  DeData
                </div>
                <div className="text-xs text-green-400 leading-tight">
                  PROTOCOL_v1.0
                </div>
              </div>
            </Link>

            {/* Divider */}
            <div className="h-10 w-px bg-green-500/30" />

            {/* DToken Display */}
            {isConnected && (
              <div className="flex items-center gap-3">
                <CurrencyCircleDollar className="text-green-500" size={24} />
                <div className="font-mono">
                  <div className="text-xs text-green-400 leading-tight">
                    DToken Balance
                  </div>
                  <div className="text-sm font-bold text-green-500 leading-tight">
                    {balanceLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      `${displayBalance} DDATA`
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <ConnectButton.Custom>
                  {({ account, openAccountModal }) => (
                    <button
                      onClick={openAccountModal}
                      className="flex items-center gap-3 px-4 py-2 rounded hover:bg-green-500/10 transition-all"
                    >
                      <div className="relative">
                        <div className="h-10 w-10 rounded bg-green-500/20 border border-green-500 flex items-center justify-center">
                          <span className="text-green-500 text-sm font-mono font-bold">
                            {account?.displayName
                              ? account.displayName[0].toUpperCase()
                              : address?.slice(2, 4).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
                      </div>
                      <div className="font-mono text-left">
                        <div className="text-sm font-semibold text-green-500 leading-tight">
                          {account?.displayName ||
                            `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowVCModal(true)
                          }}
                          className="text-xs text-green-400 hover:text-green-300 leading-tight max-w-[200px] truncate text-left transition-colors"
                          title={address ? `did:pkh:eip155:137:${address}` : ''}
                        >
                          {address && formatDID(address)}
                        </button>
                      </div>
                    </button>
                  )}
                </ConnectButton.Custom>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/dashboard/profile')}
                    className="p-2 rounded hover:bg-green-500/10 transition-all group"
                    title="Edit Profile"
                  >
                    <Gear
                      size={20}
                      className="text-green-500 group-hover:text-green-400 transition-colors"
                    />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded hover:bg-red-500/10 transition-all group"
                    disabled={logoutMutation.isPending}
                    title="Logout"
                  >
                    <SignOut
                      size={20}
                      className="text-green-500 group-hover:text-red-500 transition-colors"
                    />
                  </button>
                </div>
              </>
            ) : (
              <ConnectButton
                chainStatus="icon"
                accountStatus="avatar"
                showBalance={false}
              />
            )}
          </div>
        </div>
      </header>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />

      {/* Swap Modal */}
      <SwapModal isOpen={showSwapModal} onClose={() => setShowSwapModal(false)} />
    </>
  )
}
