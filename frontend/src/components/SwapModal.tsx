'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
} from '@heroui/react'
import {
  ArrowDown,
  Info,
  ArrowCircleRight,
  Warning,
  PencilSimple,
  Check,
  X,
} from '@phosphor-icons/react'
import { useTokenSwap, SwapErrorType } from '@/application/hooks/useTokenSwap'
import { TOKENS, TOKEN_LIST, FEE_TIERS } from '@/lib/blockchain/tokens'
import { Currency, Token } from '@uniswap/sdk-core'
import toast from 'react-hot-toast'
import { TransactionStatusModal } from './TransactionStatusModal'

interface SwapModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const outputToken = TOKENS.DDATA
  const [inputToken, setInputToken] = useState<Currency>(TOKENS.Polygon)
  const [isNativeToken, setIsNativeToken] = useState(false)
  const [customSlippage, setCustomSlippage] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<
    'pending' | 'success' | 'error'
  >('pending')
  const [statusErrorMessage, setStatusErrorMessage] = useState<string>('')
  const [editingSlippage, setEditingSlippage] = useState(false)
  const [editingFeeTier, setEditingFeeTier] = useState(false)
  const [tempSlippage, setTempSlippage] = useState('')
  const [tempFeeTier, setTempFeeTier] = useState<number>(FEE_TIERS.LOW)

  const {
    inputAmount,
    setInputAmount,
    slippage,
    setSlippage,
    selectedFee,
    setSelectedFee,
    balanceFormatted,
    quote,
    isQuoting,
    quoteError,
    executeSwap,
    isSwapping,
    isConfirming,
    isConfirmed,
    swapError,
    txHash,
    needsApproval,
    approveToken,
    isApproving,
  } = useTokenSwap(
    isNativeToken ? TOKENS.WMATIC : (inputToken as Token),
    outputToken
  )

  const availableInputTokens = useMemo(() => {
    return TOKEN_LIST.filter((t) => {
      const token = t.token
      if ('isNative' in token && token.isNative) return true
      if ('address' in token) return token.symbol !== 'DDATA'
      return false
    })
  }, [])

  const handleClose = () => {
    setShowConfirm(false)
    setEditingSlippage(false)
    setEditingFeeTier(false)
    onClose()
  }

  const handleSetMax = () => {
    setInputAmount(balanceFormatted)
  }

  const handleSlippageEdit = () => {
    setEditingSlippage(true)
    setTempSlippage(customSlippage || (slippage / 100).toString())
  }

  const handleConfirmSlippage = () => {
    const numValue = parseFloat(tempSlippage)
    if (!isNaN(numValue) && numValue > 0 && numValue <= 50) {
      setSlippage(Math.floor(numValue * 100))
      setCustomSlippage(tempSlippage)
    }
    setEditingSlippage(false)
  }

  const handleCancelSlippage = () => {
    setTempSlippage('')
    setEditingSlippage(false)
  }

  const handleTempSlippageChange = (value: number) => {
    setTempSlippage((value / 100).toString())
  }

  const handleTempCustomSlippageChange = (value: string) => {
    setTempSlippage(value)
  }

  const handleFeeTierEdit = () => {
    setEditingFeeTier(true)
    setTempFeeTier(selectedFee)
  }

  const handleConfirmFeeTier = () => {
    setSelectedFee(tempFeeTier)
    setEditingFeeTier(false)
  }

  const handleCancelFeeTier = () => {
    setTempFeeTier(selectedFee)
    setEditingFeeTier(false)
  }

  const hasInsufficientBalance = useMemo(() => {
    if (!inputAmount || !balanceFormatted) return false
    return parseFloat(balanceFormatted) < parseFloat(inputAmount)
  }, [inputAmount, balanceFormatted])

  const handleSwap = async () => {
    if (hasInsufficientBalance) {
      toast.error('Insufficient balance to complete swap')
      return
    }

    try {
      // Close confirm modal and open status modal
      setShowConfirm(false)
      handleClose()
      setTransactionStatus('pending')
      setShowStatusModal(true)

      await executeSwap()
      // Success will be handled by useEffect watching isConfirmed
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || ''
      if (
        errorMessage.includes('User denied') ||
        errorMessage.includes('User rejected') ||
        errorMessage.includes('rejected the request') ||
        errorMessage.includes('denied request signature') ||
        errorMessage.includes('User disapproved')
      ) {
        setTransactionStatus('error')
        setStatusErrorMessage('Transaction cancelled by user')
      } else {
        let cleanMessage = 'Swap failed'
        if (errorMessage.includes('insufficient funds')) {
          cleanMessage = 'Insufficient funds for gas'
        } else if (errorMessage.includes('execution reverted')) {
          cleanMessage = 'Transaction would fail - please check parameters'
        } else if (errorMessage) {
          const firstLine = errorMessage.split('\n')[0]
          if (firstLine.length < 100) {
            cleanMessage = firstLine
          }
        }
        setTransactionStatus('error')
        setStatusErrorMessage(cleanMessage)
      }
      console.error('Swap error:', error)
    }
  }

  const handleApprove = async () => {
    try {
      await approveToken()
      toast.success('Approval submitted! Waiting for confirmation...')
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || ''
      if (
        errorMessage.includes('User denied') ||
        errorMessage.includes('User rejected') ||
        errorMessage.includes('rejected the request') ||
        errorMessage.includes('denied request signature') ||
        errorMessage.includes('User disapproved')
      ) {
        toast.error('Approval cancelled by user')
      } else {
        toast.error(
          'Approval failed: ' + (errorMessage.split('\n')[0] || 'Unknown error')
        )
      }
      console.error('Approval error:', error)
    }
  }

  useEffect(() => {
    if (isConfirmed && txHash) {
      setTransactionStatus('success')
    }
  }, [isConfirmed, txHash])

  const handleStatusModalClose = () => {
    setShowStatusModal(false)
    setStatusErrorMessage('')
  }

  const getErrorStyle = (errorType?: SwapErrorType) => {
    switch (errorType) {
      case SwapErrorType.INSUFFICIENT_BALANCE:
        return {
          icon: Warning,
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
        }
      case SwapErrorType.NO_POOL:
        return {
          icon: Info,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
        }
      case SwapErrorType.INSUFFICIENT_LIQUIDITY:
        return {
          icon: Warning,
          color: 'text-orange-500',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
        }
      default:
        return {
          icon: Info,
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
        }
    }
  }

  const price = useMemo(() => {
    if (!quote || !inputAmount || parseFloat(inputAmount) === 0) return null
    const inputNum = parseFloat(inputAmount)
    const outputNum = parseFloat(quote.outputAmountFormatted)
    return (outputNum / inputNum).toFixed(6)
  }, [quote, inputAmount])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="md"
        placement="center"
        backdrop="blur"
        classNames={{
          wrapper: 'z-9999',
          backdrop: 'bg-black/80 backdrop-blur-sm',
          base: 'bg-black border border-green-500/30 rounded-lg max-w-md mx-auto',
          header: 'pt-5 pb-3',
          body: 'py-4 max-h-[70vh] overflow-y-auto flex flex-col gap-0',
          footer: 'pt-4 pb-5',
          closeButton:
            'hover:bg-red-500/10 active:bg-red-500/20 text-red-500 top-4 right-4',
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-green-500 font-mono">
              &gt; SWAP_TOKENS
            </h3>
          </ModalHeader>

          <ModalBody>
            {/* Confirmation Screen */}
            {showConfirm && quote ? (
              <div className="space-y-4">
                <div className="p-4 bg-black/50 border border-green-500/30 rounded">
                  <div className="text-xs text-green-400 font-mono mb-2">
                    Sell
                  </div>
                  <div className="text-2xl font-bold text-green-500 font-mono">
                    {inputAmount} {inputToken.symbol}
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowDown size={24} className="text-green-500" />
                </div>

                <div className="p-4 bg-black/50 border border-green-500/30 rounded">
                  <div className="text-xs text-green-400 font-mono mb-2">
                    Buy (estimated)
                  </div>
                  <div className="text-2xl font-bold text-green-500 font-mono">
                    {quote.outputAmountFormatted} {outputToken.symbol}
                  </div>
                </div>

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
                      {quote.minimumOutput} {outputToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-green-400">Slippage Tolerance</span>
                    <span className="text-green-500">{slippage / 100}%</span>
                  </div>
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-green-400">Fee Tier</span>
                    <span className="text-green-500">
                      {selectedFee / 10000}%
                    </span>
                  </div>
                </div>

                {swapError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                    <p className="text-red-500 font-mono text-xs">
                      {swapError.message}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Input Token - Can be changed */}
                <div>
                  <div className="bg-black/50 border border-green-500/30 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-green-400 font-mono">
                        Sell
                      </span>
                      <span className="text-xs text-green-400 font-mono">
                        Balance: {balanceFormatted} {inputToken.symbol}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        placeholder="0.0"
                        className="flex-1 min-w-0 bg-transparent text-2xl font-bold text-green-500 font-mono placeholder-green-400/50 focus:outline-none"
                        step="any"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleSetMax}
                          className="px-2 py-1 hover:bg-green-500/30 text-green-500 rounded-sm font-mono text-xs transition-all whitespace-nowrap"
                        >
                          MAX
                        </button>
                        <Select
                          size="sm"
                          radius="sm"
                          selectedKeys={[
                            'isNative' in inputToken && inputToken.isNative
                              ? 'NATIVE'
                              : 'address' in inputToken
                              ? inputToken.address
                              : '',
                          ]}
                          onSelectionChange={(keys) => {
                            const key = Array.from(keys)[0] as string
                            if (key === 'NATIVE') {
                              setInputToken(TOKENS.Polygon)
                              setIsNativeToken(true)
                              setInputAmount('')
                            } else {
                              const selected = availableInputTokens.find(
                                (t) => {
                                  const token = t.token
                                  return (
                                    'address' in token && token.address === key
                                  )
                                }
                              )
                              if (selected && 'address' in selected.token) {
                                setInputToken(selected.token)
                                setIsNativeToken(false)
                                setInputAmount('')
                              }
                            }
                          }}
                          classNames={{
                            base: 'w-24 min-w-0',
                            trigger:
                              'bg-green-500/20 border-0 hover:bg-green-500/30 data-[hover=true]:bg-green-500/30 h-8 min-h-0',
                            value: 'text-green-500 font-mono text-sm font-bold',
                            popoverContent:
                              'bg-black border border-green-500/30',
                            listbox: 'p-0',
                          }}
                          aria-label="Select token"
                        >
                          {availableInputTokens.map((item) => {
                            const token = item.token
                            const key =
                              'isNative' in token && token.isNative
                                ? 'NATIVE'
                                : 'address' in token
                                ? token.address
                                : ''
                            return (
                              <SelectItem
                                key={key}
                                classNames={{
                                  base: 'data-[hover=true]:bg-green-500/10 data-[selectable=true]:focus:bg-green-500/20',
                                  title: 'text-green-500 font-mono text-sm',
                                }}
                              >
                                {token.symbol}
                              </SelectItem>
                            )
                          })}
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center my-1 relative z-10">
                  <div className="p-2 bg-black border border-green-500/30 rounded-full">
                    <ArrowDown size={18} className="text-green-500" />
                  </div>
                </div>

                {/* Output Token - Fixed to DDATA */}
                <div className="mb-3">
                  <div className="bg-black/50 border border-green-500/30 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-green-400 font-mono">
                        Buy
                      </span>
                      <span className="text-xs text-green-400 font-mono">
                        {isQuoting ? 'Fetching quote...' : ''}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 min-w-0 text-2xl font-bold text-green-500 font-mono truncate">
                        {isQuoting ? (
                          <span className="animate-pulse">...</span>
                        ) : quote ? (
                          quote.outputAmountFormatted
                        ) : (
                          '0.0'
                        )}
                      </div>
                      <div className="px-2 py-1.5 bg-green-500/20 rounded-sm font-mono text-sm text-green-500 cursor-not-allowed opacity-75 shrink-0">
                        {outputToken.symbol}
                      </div>
                    </div>
                  </div>
                </div>

                {quoteError &&
                  (() => {
                    const errorStyle = getErrorStyle(quoteError.type)
                    const ErrorIcon = errorStyle.icon
                    return (
                      <div
                        className={`mb-3 p-3 ${errorStyle.bg} border ${errorStyle.border} rounded`}
                      >
                        <div className="flex items-start gap-2">
                          <ErrorIcon
                            size={16}
                            className={`${errorStyle.color} mt-0.5`}
                            weight="fill"
                          />
                          <div className="flex-1">
                            <p
                              className={`${errorStyle.color} font-mono text-xs font-bold mb-1`}
                            >
                              {quoteError.type === SwapErrorType.NO_POOL &&
                                'Pool Not Found'}
                              {quoteError.type ===
                                SwapErrorType.INSUFFICIENT_LIQUIDITY &&
                                'Insufficient Liquidity'}
                              {quoteError.type ===
                                SwapErrorType.INSUFFICIENT_BALANCE &&
                                'Insufficient Balance'}
                              {quoteError.type ===
                                SwapErrorType.SLIPPAGE_TOO_HIGH &&
                                'Price Impact Too High'}
                              {quoteError.type ===
                                SwapErrorType.NETWORK_ERROR && 'Network Error'}
                              {quoteError.type === SwapErrorType.UNKNOWN &&
                                'Quote Failed'}
                            </p>
                            <p
                              className={`${errorStyle.color} font-mono text-xs`}
                            >
                              {quoteError.message}
                            </p>
                            {quoteError.type === SwapErrorType.NO_POOL && (
                              <p className="text-green-400 font-mono text-xs mt-2">
                                💡 Tip: This trading pair may not exist on
                                Uniswap. Try other tokens or create a liquidity
                                pool on Uniswap.
                              </p>
                            )}
                            {quoteError.type ===
                              SwapErrorType.INSUFFICIENT_LIQUIDITY && (
                              <p className="text-green-400 font-mono text-xs mt-2">
                                💡 Tip: Try reducing the trade amount or
                                selecting a different fee tier.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                {/* Settings Section */}
                <div className="space-y-2.5 p-3 bg-black/50 border border-green-500/30 rounded">
                  {/* Slippage Tolerance */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-green-400 font-mono font-bold">
                        Slippage Tolerance
                      </span>
                      {!editingSlippage && (
                        <button
                          onClick={handleSlippageEdit}
                          className="p-1 hover:bg-green-500/10 rounded-sm transition-all"
                        >
                          <PencilSimple size={14} className="text-green-500" />
                        </button>
                      )}
                    </div>
                    {editingSlippage ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          {[0.5, 1, 2].map((value) => (
                            <button
                              key={value}
                              onClick={() => handleTempSlippageChange(value * 100)}
                              className={`flex-1 px-3 py-1.5 rounded-sm font-mono text-xs transition-all ${
                                parseFloat(tempSlippage) === value
                                  ? 'bg-green-500 text-black font-bold'
                                  : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                              }`}
                            >
                              {value}%
                            </button>
                          ))}
                          <input
                            type="number"
                            value={tempSlippage}
                            onChange={(e) => handleTempCustomSlippageChange(e.target.value)}
                            placeholder="Custom"
                            className="flex-1 px-3 py-1.5 bg-black border border-green-500/50 rounded-sm text-green-500 font-mono text-xs placeholder-green-400/50 focus:ring-1 focus:ring-green-500 focus:border-green-500"
                            step="0.1"
                            min="0"
                            max="50"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={handleCancelSlippage}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-sm font-mono text-xs transition-all flex items-center gap-1"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                          <button
                            onClick={handleConfirmSlippage}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-sm font-mono text-xs transition-all flex items-center gap-1"
                          >
                            <Check size={14} />
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-green-500 font-mono">
                        {slippage / 100}%
                      </div>
                    )}
                  </div>

                  {/* Fee Tier */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-green-400 font-mono font-bold">
                        Fee Tier
                      </span>
                      {!editingFeeTier && (
                        <button
                          onClick={handleFeeTierEdit}
                          className="p-1 hover:bg-green-500/10 rounded-sm transition-all"
                        >
                          <PencilSimple size={14} className="text-green-500" />
                        </button>
                      )}
                    </div>
                    {editingFeeTier ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          {[
                            FEE_TIERS.LOWEST,
                            FEE_TIERS.LOW,
                            FEE_TIERS.MEDIUM,
                            FEE_TIERS.HIGH,
                          ].map((value) => (
                            <button
                              key={value}
                              onClick={() => setTempFeeTier(value)}
                              className={`flex-1 px-3 py-1.5 rounded-sm font-mono text-xs transition-all ${
                                tempFeeTier === value
                                  ? 'bg-green-500 text-black font-bold'
                                  : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                              }`}
                            >
                              {value / 10000}%
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={handleCancelFeeTier}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-sm font-mono text-xs transition-all flex items-center gap-1"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                          <button
                            onClick={handleConfirmFeeTier}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-sm font-mono text-xs transition-all flex items-center gap-1"
                          >
                            <Check size={14} />
                            Confirm
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-green-500 font-mono">
                        {selectedFee / 10000}%
                      </div>
                    )}
                  </div>

                  {/* Quote Details */}
                  <div className="border-t border-green-500/20 pt-3">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-green-400">Exchange Rate</span>
                      <span className="text-green-500">
                        {quote && !isQuoting && price
                          ? `1 ${inputToken.symbol} ≈ ${price} ${outputToken.symbol}`
                          : '--'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-green-400">Minimum Received</span>
                      <span className="text-green-500">
                        {quote && !isQuoting
                          ? `${quote.minimumOutput} ${outputToken.symbol}`
                          : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </ModalBody>

          <ModalFooter className="gap-3">
            {showConfirm ? (
              <>
                <Button
                  color="default"
                  variant="bordered"
                  radius="sm"
                  onPress={() => setShowConfirm(false)}
                  className="border-green-500 text-green-500 font-mono"
                >
                  Back
                </Button>
                {needsApproval ? (
                  <Button
                    color="warning"
                    radius="sm"
                    onPress={handleApprove}
                    isDisabled={isApproving || hasInsufficientBalance}
                    className="bg-yellow-500 text-black font-mono"
                  >
                    {isApproving
                      ? 'Approving...'
                      : hasInsufficientBalance
                      ? 'Insufficient Balance'
                      : `Approve ${inputToken.symbol}`}
                  </Button>
                ) : (
                  <Button
                    color="success"
                    radius="sm"
                    onPress={handleSwap}
                    isDisabled={
                      isSwapping || isConfirming || hasInsufficientBalance
                    }
                    className="bg-green-500 text-black font-mono"
                  >
                    {isSwapping || isConfirming
                      ? 'Processing...'
                      : hasInsufficientBalance
                      ? 'Insufficient Balance'
                      : 'Confirm Swap'}
                  </Button>
                )}
              </>
            ) : (
              <>
                {needsApproval ? (
                  <Button
                    color="warning"
                    radius="sm"
                    onPress={handleApprove}
                    isDisabled={
                      !inputAmount ||
                      parseFloat(inputAmount) <= 0 ||
                      hasInsufficientBalance ||
                      isApproving
                    }
                    className="w-full bg-yellow-500 text-black font-mono"
                  >
                    {!inputAmount || parseFloat(inputAmount) <= 0
                      ? 'Enter Amount'
                      : hasInsufficientBalance
                      ? 'Insufficient Balance'
                      : isApproving
                      ? 'Approving...'
                      : `Approve ${inputToken.symbol}`}
                  </Button>
                ) : (
                  <Button
                    color="success"
                    radius="sm"
                    onPress={() => setShowConfirm(true)}
                    isDisabled={
                      !inputAmount ||
                      !quote ||
                      isQuoting ||
                      parseFloat(inputAmount) <= 0 ||
                      hasInsufficientBalance
                    }
                    className="w-full bg-green-500 text-black font-mono"
                    endContent={
                      inputAmount &&
                      parseFloat(inputAmount) > 0 &&
                      quote &&
                      !hasInsufficientBalance ? (
                        <ArrowCircleRight size={18} />
                      ) : undefined
                    }
                  >
                    {!inputAmount || parseFloat(inputAmount) <= 0
                      ? 'Enter Amount'
                      : hasInsufficientBalance
                      ? 'Insufficient Balance'
                      : 'Review Swap'}
                  </Button>
                )}
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <TransactionStatusModal
        isOpen={showStatusModal}
        onClose={handleStatusModalClose}
        status={transactionStatus}
        txHash={txHash}
        errorMessage={statusErrorMessage}
      />
    </>
  )
}
