/**
 * X402 Payment Modal Component
 * Payment modal: QR code display + wallet invocation + auto polling
 * Using HeroUI Modal component
 */

'use client'

import { useEffect, useState } from 'react'
import { X402Challenge } from '@/domain/entities'
import { QRCodeSVG } from 'qrcode.react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react'
import { useSendTransaction, useAccount, useSwitchChain } from 'wagmi'
import { parseUnits } from 'viem'
import toast from 'react-hot-toast'
import {
  Copy,
  CheckCircle,
  ArrowClockwise,
  QrCode,
  Wallet,
} from '@phosphor-icons/react'

// USDT Contract Addresses
const USDT_ADDRESSES: Record<string, `0x${string}`> = {
  'Polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  'polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  'Ethereum': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'ethereum': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
}

// Chain IDs
const CHAIN_IDS: Record<string, number> = {
  'Polygon': 137,
  'polygon': 137,
  'Ethereum': 1,
  'ethereum': 1,
}

interface X402PaymentModalProps {
  challenge: X402Challenge | null
  isOpen: boolean
  onClose: () => void
  onPaymentConfirmed: () => void
  onStartPolling: (orderId: string) => void
  isPolling: boolean
  nextPollTime: number | null
  error: string | null
  loading: boolean
}

export function X402PaymentModal({
  challenge,
  isOpen,
  onClose,
  onPaymentConfirmed,
  onStartPolling,
  isPolling,
  nextPollTime,
  error,
  loading,
}: X402PaymentModalProps) {
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const { chain } = useAccount()
  const { switchChain } = useSwitchChain()
  const { sendTransaction, isPending: isSending } = useSendTransaction()

  // Calculate countdown to next poll
  useEffect(() => {
    if (!nextPollTime) {
      setCountdown(0)
      return
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((nextPollTime - Date.now()) / 1000))
      setCountdown(remaining)

      if (remaining === 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [nextPollTime])

  if (!challenge) return null

  // Copy address
  const copyAddress = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(challenge.payment_address)
        setCopied(true)
        toast.success('Address copied!')
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = challenge.payment_address
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        toast.success('Address copied!')
      }
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
      toast.error('Failed to copy address')
    }
  }

  // Send USDT transaction
  const sendPayment = async () => {
    if (!challenge) return

    const targetChainId = CHAIN_IDS[challenge.blockchain_name]
    const usdtAddress = USDT_ADDRESSES[challenge.blockchain_name]

    if (!targetChainId || !usdtAddress) {
      toast.error(`Unsupported network: ${challenge.blockchain_name}`)
      return
    }

    // Check if we need to switch chain
    if (chain?.id !== targetChainId) {
      try {
        toast.loading(`Switching to ${challenge.blockchain_name}...`, { duration: 2000 })
        switchChain({ chainId: targetChainId })
        toast.success(`Switched to ${challenge.blockchain_name}`)
      } catch (err: any) {
        console.error('[X402] Chain switch failed:', err)
        toast.error(`Please switch to ${challenge.blockchain_name} network manually`)
        return
      }
    }

    // ERC20 transfer function: transfer(address,uint256)
    const addressParam = challenge.payment_address.slice(2).padStart(64, '0')
    const amountParam = parseUnits(challenge.price_amount, 6).toString(16).padStart(64, '0')
    const transferData = `0xa9059cbb${addressParam}${amountParam}` as `0x${string}`

    try {
      sendTransaction({
        to: usdtAddress,
        data: transferData,
      }, {
        onSuccess: (hash) => {
          console.log('[X402] Transaction sent:', hash)
          toast.success('Transaction sent! Verifying payment...')
          onStartPolling(challenge.order_id)
        },
        onError: (err) => {
          console.error('[X402] Transaction failed:', err)
          toast.error('Transaction failed: ' + err.message)
        }
      })
    } catch (err: any) {
      console.error('[X402] Send transaction error:', err)
      toast.error('Failed to send transaction')
    }
  }

  // Payment completed - start polling
  const handlePaymentDone = () => {
    onStartPolling(challenge.order_id)
  }

  // Manual check payment status
  const handleManualCheck = () => {
    onPaymentConfirmed()
  }

  // Check if current chain matches required chain
  const isWrongChain = chain?.id !== CHAIN_IDS[challenge.blockchain_name]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      placement="center"
      backdrop="blur"
      classNames={{
        wrapper: 'z-9999',
        backdrop: 'bg-black/80 backdrop-blur-sm',
        base: 'bg-black border border-green-500/30 rounded-lg',
        header: 'pt-5 pb-3',
        body: 'py-4',
        footer: 'pt-4 pb-5',
        closeButton: 'hover:bg-red-500/10 active:bg-red-500/20 text-red-500 top-4 right-4',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 border border-green-500 rounded px-3 py-1">
              <span className="text-green-500 font-mono font-bold text-sm">X402</span>
            </div>
            <h3 className="text-lg font-bold text-green-500 font-mono">
              &gt; zai1PAYMENT_REQUIRED
            </h3>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left Column - QR Code & Address */}
            <div className="bg-black/50 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode size={16} className="text-green-400" />
                <span className="text-xs font-mono text-green-400 uppercase">Payment Address</span>
              </div>

              {/* QR Code */}
              <div className="flex justify-center bg-white rounded-lg p-2 mb-3">
                <QRCodeSVG
                  value={challenge.payment_address}
                  size={140}
                  level="H"
                />
              </div>

              {/* Address */}
              <div className="bg-black/50 border border-green-500/30 rounded px-3 py-2 mb-2">
                <p className="text-xs font-mono text-green-500 break-all select-all text-center">
                  {challenge.payment_address}
                </p>
              </div>

              {/* Copy Button */}
              <button
                onClick={copyAddress}
                className="w-full flex items-center justify-center gap-2 bg-green-500/20 border border-green-500 rounded px-3 py-2 hover:bg-green-500/30 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle size={14} className="text-green-500" weight="fill" />
                    <span className="text-xs font-mono text-green-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-green-400" />
                    <span className="text-xs font-mono text-green-400">Copy Address</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column - Payment Info & Actions */}
            <div className="space-y-4">
              {/* Payment Amount */}
              <div className="bg-black/50 border border-green-500/30 rounded-lg p-4 text-center">
                <p className="text-xs font-mono text-green-400 mb-1">AMOUNT</p>
                <p className="text-2xl font-bold text-green-500 font-mono">
                  {challenge.price_amount} <span className="text-sm">{challenge.token_symbol}</span>
                </p>
                <p className="text-xs font-mono text-green-400/60 mt-1">
                  {challenge.blockchain_name}
                </p>
              </div>

              {/* Wrong Chain Warning */}
              {isWrongChain && (
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-2">
                  <p className="text-xs text-yellow-400 font-mono text-center">
                    Switch to {challenge.blockchain_name}
                  </p>
                </div>
              )}

              {/* Polling Status */}
              {isPolling && (
                <div className="flex items-center justify-center gap-2 bg-yellow-500/20 border border-yellow-500 px-3 py-2 rounded">
                  <ArrowClockwise size={16} className="animate-spin text-yellow-500" />
                  <span className="font-mono text-sm font-bold text-yellow-500">
                    {countdown > 0 ? `${countdown}s` : 'Verifying...'}
                  </span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-2">
                  <p className="text-xs text-red-400 font-mono text-center">{error}</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-black/50 border border-green-500/20 rounded-lg p-3">
                <p className="text-xs text-green-400/80 font-mono mb-1">&gt; INSTRUCTIONS:</p>
                <div className="space-y-0.5 text-xs text-green-400/60 font-mono">
                  <p>• Pay via wallet or scan QR code</p>
                  <p>• Powered by X402 Protocol</p>
                  <p>• HTTP 402 Payment Supported</p>
                  <p>• Auto-verify after payment</p>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex-col gap-2">
          {/* Send Payment Button */}
          <Button
            color="success"
            radius="sm"
            onPress={sendPayment}
            isDisabled={isSending || isPolling}
            isLoading={isSending}
            className="w-full bg-green-500 text-black font-mono font-bold"
            startContent={!isSending && <Wallet size={20} weight="fill" />}
          >
            {isSending ? 'Sending...' : 'Pay with Wallet'}
          </Button>

          {/* Manual Payment / Verify Buttons */}
          {!isPolling ? (
            <Button
              color="default"
              variant="bordered"
              radius="sm"
              onPress={handlePaymentDone}
              isDisabled={loading}
              className="w-full border-green-500/30 text-green-400 font-mono text-sm hover:border-green-500"
            >
              I&apos;ve Paid Manually
            </Button>
          ) : (
            <Button
              color="default"
              variant="bordered"
              radius="sm"
              onPress={handleManualCheck}
              isDisabled={loading}
              className="w-full border-green-500/30 text-green-400 font-mono text-sm hover:border-green-500"
              startContent={<ArrowClockwise size={14} />}
            >
              Check Now
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
