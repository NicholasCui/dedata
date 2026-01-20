'use client'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import { ArrowDown } from '@phosphor-icons/react'
import { Currency } from '@uniswap/sdk-core'

interface SwapConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  inputToken: Currency
  outputToken: Currency
  inputAmount: string
  outputAmount: string
  price: string | null
  minimumOutput: string
  slippage: number
  feeTier: number
  hasInsufficientBalance: boolean
  needsApproval: boolean
  isApproving: boolean
  isSwapping: boolean
  isConfirming: boolean
  swapError: { message: string } | null
  onApprove: () => void
  onConfirmSwap: () => void
}

export function SwapConfirmModal({
  isOpen,
  onClose,
  inputToken,
  outputToken,
  inputAmount,
  outputAmount,
  price,
  minimumOutput,
  slippage,
  feeTier,
  hasInsufficientBalance,
  needsApproval,
  isApproving,
  isSwapping,
  isConfirming,
  swapError,
  onApprove,
  onConfirmSwap,
}: SwapConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      placement="center"
      backdrop="blur"
      classNames={{
        wrapper: 'z-[9999]',
        backdrop: 'bg-black/80 backdrop-blur-sm',
        base: 'bg-black border border-green-500/30 rounded-lg max-w-md mx-auto',
        header: 'pt-5 pb-3',
        body: 'py-4',
        footer: 'pt-4 pb-5',
        closeButton: 'hover:bg-red-500/10 active:bg-red-500/20 text-red-500 top-4 right-4',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-green-500 font-mono">&gt; CONFIRM_SWAP</h3>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            {/* Input Amount */}
            <div className="p-4 bg-black/50 border border-green-500/30 rounded">
              <div className="text-xs text-green-400 font-mono mb-2">Sell</div>
              <div className="text-2xl font-bold text-green-500 font-mono">
                {inputAmount} {inputToken.symbol}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowDown size={24} className="text-green-500" />
            </div>

            {/* Output Amount */}
            <div className="p-4 bg-black/50 border border-green-500/30 rounded">
              <div className="text-xs text-green-400 font-mono mb-2">Buy (estimated)</div>
              <div className="text-2xl font-bold text-green-500 font-mono">
                {outputAmount} {outputToken.symbol}
              </div>
            </div>

            {/* Transaction Details */}
            <div className="space-y-2 p-4 bg-black/50 border border-green-500/30 rounded">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-green-400">Exchange Rate</span>
                <span className="text-green-500">
                  1 {inputToken.symbol} ≈ {price} {outputToken.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm font-mono">
                <span className="text-green-400">Minimum Received</span>
                <span className="text-green-500">
                  {minimumOutput} {outputToken.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm font-mono">
                <span className="text-green-400">Slippage Tolerance</span>
                <span className="text-green-500">{slippage / 100}%</span>
              </div>
              <div className="flex justify-between text-sm font-mono">
                <span className="text-green-400">Fee Tier</span>
                <span className="text-green-500">{feeTier / 10000}%</span>
              </div>
            </div>

            {/* Error Message */}
            {swapError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                <p className="text-red-500 font-mono text-xs">{swapError.message}</p>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter className="gap-3">
          <Button
            onClick={onClose}
            className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 border border-gray-500/30 font-mono"
          >
            Cancel
          </Button>
          {needsApproval ? (
            <Button
              onClick={onApprove}
              disabled={isApproving || hasInsufficientBalance}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-mono font-bold"
            >
              {isApproving
                ? 'Approving...'
                : hasInsufficientBalance
                ? 'Insufficient Balance'
                : `Approve ${inputToken.symbol}`}
            </Button>
          ) : (
            <Button
              onClick={onConfirmSwap}
              disabled={isSwapping || isConfirming || hasInsufficientBalance}
              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-mono font-bold"
            >
              {isSwapping || isConfirming
                ? 'Processing...'
                : hasInsufficientBalance
                ? 'Insufficient Balance'
                : 'Confirm Swap'}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
