import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]

const NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS || '0x0f17A994aa42a9E42584BAF0246B973D1C641FFd'
const NEXT_PUBLIC_POLYGON_RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com'

export function useDTokenBalance() {
  const { address, isConnected } = useAccount()
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!address || !isConnected) {
      setBalance('0')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // 创建 provider
      const provider = new ethers.providers.JsonRpcProvider(NEXT_PUBLIC_POLYGON_RPC_URL)

      // 创建合约实例
      const tokenContract = new ethers.Contract(
        NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS,
        ERC20_ABI,
        provider
      )

      // 获取余额
      const rawBalance = await tokenContract.balanceOf(address)
      const decimals = await tokenContract.decimals()

      // 格式化余额
      const formattedBalance = ethers.utils.formatUnits(rawBalance, decimals)
      setBalance(formattedBalance)
    } catch (err) {
      console.error('Failed to fetch DToken balance:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch balance')
      setBalance('0')
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected])

  useEffect(() => {
    // 初始查询
    fetchBalance()

    // 每 30 秒查询一次
    const interval = setInterval(fetchBalance, 30000)

    return () => clearInterval(interval)
  }, [fetchBalance])

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  }
}

// 发送 DToken 的 hook
export function useDTokenTransfer() {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transfer = async (toAddress: string, amount: string) => {
    if (!address) {
      throw new Error('No wallet connected')
    }

    try {
      setIsLoading(true)
      setError(null)

      // 获取 provider 和 signer
      // @ts-ignore
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()

      // 创建合约实例
      const tokenContract = new ethers.Contract(
        NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS,
        [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)'
        ],
        signer
      )

      // 获取 decimals
      const decimals = await tokenContract.decimals()
      const amountWei = ethers.utils.parseUnits(amount, decimals)

      // 发送交易
      const tx = await tokenContract.transfer(toAddress, amountWei)
      
      // 等待交易确认
      const receipt = await tx.wait()

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      }
    } catch (err) {
      console.error('Transfer failed:', err)
      setError(err instanceof Error ? err.message : 'Transfer failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    transfer,
    isLoading,
    error,
  }
}