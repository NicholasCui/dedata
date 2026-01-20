import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'

// Token contract ABI - only the balanceOf function
const TOKEN_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Token contract address from env
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS as `0x${string}` || '0x0f17A994aa42a9E42584BAF0246B973D1C641FFd'

export function useTokenBalance() {
  const { address } = useAccount()
  
  const { data: balance, isError, isLoading, refetch } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
      staleTime: 5000, // Consider data stale after 5 seconds
    }
  })

  return {
    balance: balance ? balance.toString() : '0',
    balanceFormatted: balance ? formatUnits(balance, 18) : '0',
    isLoading,
    isError,
    refetch
  }
}