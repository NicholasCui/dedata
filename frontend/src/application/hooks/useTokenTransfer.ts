import { useState, useCallback } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import ERC20_ABI from '@/lib/abis/ERC20.json'

export enum TransferErrorType {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface TransferError {
  type: TransferErrorType
  message: string
  originalError?: unknown
}

interface UseTokenTransferProps {
  tokenAddress: `0x${string}`
  tokenDecimals: number
  tokenSymbol?: string
}

export function useTokenTransfer({
  tokenAddress,
  tokenDecimals,
  tokenSymbol = 'UNKNOWN',
}: UseTokenTransferProps) {
  const { address } = useAccount()
  const [transferAmount, setTransferAmount] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')

  const {
    writeContractAsync,
    data: hash,
    error: transferError,
    isPending: isTransferring,
  } = useWriteContract()

  // Get token balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Format balance
  const balanceRaw = balance as bigint | undefined
  const balanceFormatted = balanceRaw
    ? formatUnits(balanceRaw, tokenDecimals)
    : '0'

  // Wait for transfer transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

  // Error parsing
  const parseTransferError = useCallback(
    (error: unknown): TransferError => {
      const errorMessage =
        error instanceof Error
          ? error.message.toLowerCase()
          : String(error).toLowerCase()

      if (
        errorMessage.includes('insufficient') ||
        errorMessage.includes('exceeds balance')
      ) {
        return {
          type: TransferErrorType.INSUFFICIENT_BALANCE,
          message: `Insufficient ${tokenSymbol} balance`,
          originalError: error,
        }
      }

      if (
        errorMessage.includes('invalid address') ||
        errorMessage.includes('invalid recipient')
      ) {
        return {
          type: TransferErrorType.INVALID_ADDRESS,
          message: 'Invalid recipient address',
          originalError: error,
        }
      }

      if (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')
      ) {
        return {
          type: TransferErrorType.NETWORK_ERROR,
          message: 'Network error — check connection',
          originalError: error,
        }
      }

      return {
        type: TransferErrorType.UNKNOWN,
        message: error instanceof Error ? error.message : 'Transfer failed',
        originalError: error,
      }
    },
    [tokenSymbol]
  )

  // Validate inputs
  const validateTransfer = useCallback((): TransferError | null => {
    if (!recipientAddress) {
      return {
        type: TransferErrorType.INVALID_ADDRESS,
        message: 'Please enter a recipient address',
      }
    }

    if (!isAddress(recipientAddress)) {
      return {
        type: TransferErrorType.INVALID_ADDRESS,
        message: 'Invalid recipient address format',
      }
    }

    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      return {
        type: TransferErrorType.INVALID_AMOUNT,
        message: 'Please enter a valid amount',
      }
    }

    const amountBigInt = parseUnits(transferAmount, tokenDecimals)
    if (balanceRaw === undefined || balanceRaw < amountBigInt) {
      return {
        type: TransferErrorType.INSUFFICIENT_BALANCE,
        message: `Insufficient ${tokenSymbol} balance`,
      }
    }

    return null
  }, [
    recipientAddress,
    transferAmount,
    tokenDecimals,
    tokenSymbol,
    balanceRaw,
  ])

  // Execute transfer
  const executeTransfer = useCallback(async () => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    // Validate before transfer
    const validationError = validateTransfer()
    if (validationError) {
      throw validationError
    }

    try {
      const amountBigInt = parseUnits(transferAmount, tokenDecimals)

      const txHash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountBigInt],
      })

      console.log('Transfer tx sent:', txHash)

      // Refetch balance after transfer
      await refetchBalance()

      return txHash
    } catch (error) {
      console.error('Transfer error:', error)
      throw parseTransferError(error)
    }
  }, [
    address,
    transferAmount,
    recipientAddress,
    tokenAddress,
    tokenDecimals,
    writeContractAsync,
    validateTransfer,
    parseTransferError,
    refetchBalance,
  ])

  // Check if address is valid
  const isValidAddress = useCallback(() => {
    if (!recipientAddress) return false
    return isAddress(recipientAddress)
  }, [recipientAddress])

  // Check if has insufficient balance
  const hasInsufficientBalance = useCallback(() => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) return false
    if (!balanceRaw) return true

    try {
      const amountBigInt = parseUnits(transferAmount, tokenDecimals)
      return balanceRaw < amountBigInt
    } catch {
      return true
    }
  }, [transferAmount, balanceRaw, tokenDecimals])

  return {
    // Input state
    transferAmount,
    setTransferAmount,
    recipientAddress,
    setRecipientAddress,

    // Balance
    balance: balanceRaw ? balanceRaw.toString() : '0',
    balanceFormatted,
    refetchBalance,

    // Validation
    isValidAddress: isValidAddress(),
    hasInsufficientBalance: hasInsufficientBalance(),
    validateTransfer,

    // Transfer
    executeTransfer,
    isTransferring,
    isConfirming,
    isConfirmed,
    transferError,
    txHash: hash,
  }
}
