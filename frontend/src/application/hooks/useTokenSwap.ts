import { useState, useCallback, useEffect } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  usePublicClient,
} from 'wagmi'
import { Token, Currency } from '@uniswap/sdk-core'
import { parseUnits, formatUnits } from 'viem'
import {
  FEE_TIERS,
  DEFAULT_SLIPPAGE,
  SWAP_ROUTER_ADDRESS,
} from '@/lib/blockchain/tokens'
import QUOTER_V3_ABI from '@/lib/abis/QuoterV3.json'
import SWAP_ROUTER_ABI from '@/lib/abis/SwapRouter.json'
import ERC20_ABI from '@/lib/abis/ERC20.json'

// Quoter V3 address on Polygon
const QUOTER_V3_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

export interface SwapQuote {
  outputAmount: string
  outputAmountFormatted: string
  priceImpact: string
  minimumOutput: string
  fee: number
  gasEstimate: string
}

export enum SwapErrorType {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  NO_POOL = 'NO_POOL',
  SLIPPAGE_TOO_HIGH = 'SLIPPAGE_TOO_HIGH',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface SwapError {
  type: SwapErrorType
  message: string
  originalError?: unknown
}

export function useTokenSwap(inputToken: Currency, outputToken: Token) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [inputAmount, setInputAmount] = useState('')
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE) // in basis points
  const [selectedFee, setSelectedFee] = useState(FEE_TIERS.MEDIUM)
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [isQuoting, setIsQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState<SwapError | null>(null)

  const {
    writeContractAsync,
    data: hash,
    error: swapError,
    isPending: isSwapping,
  } = useWriteContract()

  // Separate write contract for approval
  const {
    writeContractAsync: approveAsync,
    isPending: isApproving,
  } = useWriteContract()

  // Get input token balance
  const { data: nativeBalance } = useBalance({ address })
  const { data: erc20Balance } = useReadContract({
    address: inputToken.isNative
      ? undefined
      : (inputToken.address as `0x${string}`),
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address && !inputToken.isNative ? [address] : undefined,
    query: { enabled: !!address && !inputToken.isNative },
  })

  // Get current allowance for SwapRouter
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: inputToken.isNative
      ? undefined
      : (inputToken.address as `0x${string}`),
    abi: ERC20_ABI,
    functionName: 'allowance',
    args:
      address && !inputToken.isNative
        ? [address, SWAP_ROUTER_ADDRESS as `0x${string}`]
        : undefined,
    query: { enabled: !!address && !inputToken.isNative },
  })

  // Format balance
  const balanceRaw = inputToken.isNative
    ? nativeBalance?.value
    : (erc20Balance as bigint | undefined)
  const balanceFormatted = balanceRaw
    ? formatUnits(balanceRaw, inputToken.decimals)
    : '0'

  // Wait for swap transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })

  // Error parsing
  const parseSwapError = useCallback(
    (error: unknown): SwapError => {
      const errorMessage =
        error instanceof Error
          ? error.message.toLowerCase()
          : String(error).toLowerCase()
      if (
        errorMessage.includes('insufficient liquidity') ||
        errorMessage.includes('insufficient output amount') ||
        errorMessage.includes('slt')
      ) {
        return {
          type: SwapErrorType.INSUFFICIENT_LIQUIDITY,
          message: 'Insufficient liquidity in pool',
          originalError: error,
        }
      }
      if (
        errorMessage.includes('pool does not exist') ||
        errorMessage.includes('no pool') ||
        errorMessage.includes('pool not found') ||
        errorMessage.includes('reverted')
      ) {
        return {
          type: SwapErrorType.NO_POOL,
          message: `No ${inputToken.symbol}/${outputToken.symbol} pool found with this fee tier`,
          originalError: error,
        }
      }
      if (
        errorMessage.includes('slippage') ||
        errorMessage.includes('price impact')
      ) {
        return {
          type: SwapErrorType.SLIPPAGE_TOO_HIGH,
          message: 'Price impact too high',
          originalError: error,
        }
      }
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')
      ) {
        return {
          type: SwapErrorType.NETWORK_ERROR,
          message: 'Network error — check connection',
          originalError: error,
        }
      }
      return {
        type: SwapErrorType.UNKNOWN,
        message: error instanceof Error ? error.message : 'Quote failed',
        originalError: error,
      }
    },
    [inputToken.symbol, outputToken.symbol]
  )

  // Get quote using Uniswap V3
  const getQuote = useCallback(async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0 || !publicClient) {
      setQuote(null)
      return
    }

    try {
      setIsQuoting(true)
      setQuoteError(null)

      const amountIn = parseUnits(inputAmount, inputToken.decimals)
      const tokenIn = inputToken.isNative
        ? inputToken.wrapped.address
        : inputToken.address
      const tokenOut = outputToken.address

      // Call Uniswap V3 Quoter
      const amountOut = (await publicClient.readContract({
        address: QUOTER_V3_ADDRESS as `0x${string}`,
        abi: QUOTER_V3_ABI as any,
        functionName: 'quoteExactInputSingle',
        args: [
          tokenIn as `0x${string}`,
          tokenOut as `0x${string}`,
          selectedFee,
          amountIn,
          BigInt(0), // sqrtPriceLimitX96 = 0 means no limit
        ],
      })) as bigint

      const outputAmount = amountOut.toString()

      const minimumOutput = (
        (BigInt(outputAmount) * BigInt(10000 - slippage)) /
        BigInt(10000)
      ).toString()

      setQuote({
        outputAmount,
        outputAmountFormatted: formatUnits(
          BigInt(outputAmount),
          outputToken.decimals
        ),
        priceImpact: '0', // V3 doesn't provide price impact directly
        minimumOutput: formatUnits(BigInt(minimumOutput), outputToken.decimals),
        fee: selectedFee,
        gasEstimate: '0', // Estimate separately if needed
      })
    } catch (error) {
      console.error('Quote error:', error)
      setQuoteError(parseSwapError(error))
      setQuote(null)
    } finally {
      setIsQuoting(false)
    }
  }, [
    inputAmount,
    inputToken,
    outputToken,
    selectedFee,
    slippage,
    publicClient,
    parseSwapError,
  ])

  // Auto-fetch quote when input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      getQuote()
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timer)
  }, [getQuote])

  // Execute swap using Uniswap V3 SwapRouter
  const executeSwap = useCallback(async () => {
    if (!address || !quote || isQuoting || !publicClient) return

    // Basic parameters
    const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour
    const amountIn = parseUnits(inputAmount, inputToken.decimals)
    const amountOutMinimum = parseUnits(
      quote.minimumOutput,
      outputToken.decimals
    )

    // Balance check
    if (balanceRaw === undefined || balanceRaw < amountIn) {
      throw {
        type: SwapErrorType.INSUFFICIENT_BALANCE,
        message: 'Insufficient balance',
      } as SwapError
    }

    const tokenIn = inputToken.isNative
      ? inputToken.wrapped.address
      : inputToken.address
    const tokenOut = outputToken.address

    // Build swap params for V3
    const swapParams = {
      tokenIn: tokenIn as `0x${string}`,
      tokenOut: tokenOut as `0x${string}`,
      fee: selectedFee,
      recipient: address,
      deadline: BigInt(deadline),
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: BigInt(0),
    }

    // Native token requires value
    const txOpts = inputToken.isNative ? { value: amountIn } : {}

    // Send transaction
    const txHash = await writeContractAsync({
      address: SWAP_ROUTER_ADDRESS as `0x${string}`,
      abi: SWAP_ROUTER_ABI as any,
      functionName: 'exactInputSingle',
      args: [swapParams],
      ...(txOpts as any),
    })

    console.log('Swap tx sent:', txHash)
  }, [
    address,
    quote,
    isQuoting,
    publicClient,
    inputAmount,
    inputToken,
    outputToken,
    selectedFee,
    balanceRaw,
    writeContractAsync,
  ])

  // Approve token for SwapRouter
  const approveToken = useCallback(async () => {
    if (!address || !inputToken || inputToken.isNative) return

    const amountIn = parseUnits(inputAmount, inputToken.decimals)

    // Approve SwapRouter to spend tokens (use max uint256 for unlimited approval)
    const maxApproval = BigInt(
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    )

    const txHash = await approveAsync({
      address: inputToken.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SWAP_ROUTER_ADDRESS as `0x${string}`, maxApproval],
    })

    console.log('Approval tx sent:', txHash)

    // Refetch allowance after approval
    await refetchAllowance()
  }, [address, inputToken, inputAmount, approveAsync, refetchAllowance])

  // Check if approval is needed
  const needsApproval = useCallback(() => {
    if (inputToken.isNative) return false
    if (!inputAmount || parseFloat(inputAmount) <= 0) return false
    if (!allowance) return true

    const amountIn = parseUnits(inputAmount, inputToken.decimals)
    return (allowance as bigint) < amountIn
  }, [inputToken, inputAmount, allowance])

  return {
    // Input state
    inputAmount,
    setInputAmount,
    slippage,
    setSlippage,
    selectedFee,
    setSelectedFee,

    // Balance
    balance: balanceRaw ? balanceRaw.toString() : '0',
    balanceFormatted,

    // Quote
    quote,
    isQuoting,
    quoteError,
    refetchQuote: getQuote,

    // Approval
    needsApproval: needsApproval(),
    approveToken,
    isApproving,
    allowance: allowance ? (allowance as bigint).toString() : '0',

    // Swap
    executeSwap,
    isSwapping,
    isConfirming,
    isConfirmed,
    swapError,
    txHash: hash,
  }
}
