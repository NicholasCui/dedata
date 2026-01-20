import { ethers } from 'ethers'

// ERC20 ABI - 只包含我们需要的函数
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

// 配置
const config = {
  // Polygon RPC URL (服务端)
  rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
  // 管理员钱包私钥（仅服务端，绝对不能使用NEXT_PUBLIC前缀）
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
  // DEDATA Token 合约地址
  tokenAddress: process.env.NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS || '0x0f17A994aa42a9E42584BAF0246B973D1C641FFd',
  // Gas 配置
  gasLimit: 100000,
}

export class TokenTransferService {
  private provider: ethers.providers.JsonRpcProvider
  private adminWallet: ethers.Wallet
  private tokenContract: ethers.Contract

  constructor() {
    // 初始化 provider
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl)

    // 初始化管理员钱包
    if (!config.adminPrivateKey) {
      throw new Error('Admin private key not configured')
    }
    this.adminWallet = new ethers.Wallet(config.adminPrivateKey, this.provider)
    
    // 初始化 token 合约
    this.tokenContract = new ethers.Contract(
      config.tokenAddress,
      ERC20_ABI,
      this.adminWallet
    )
  }

  /**
   * 发送代币给用户
   */
  async transferTokens(
    toAddress: string,
    amount: number,
    reason: string
  ): Promise<{
    txHash: string
    status: 'PENDING' | 'SUCCESS' | 'FAILED'
    amount: string
    error?: string
  }> {
    try {
      // 获取代币精度
      const decimals = await this.tokenContract.decimals()

      // 转换金额为最小单位
      const amountWei = ethers.utils.parseUnits(amount.toString(), decimals)
      
      // 检查管理员余额
      const adminBalance = await this.tokenContract.balanceOf(this.adminWallet.address)
      if (adminBalance < amountWei) {
        throw new Error('Insufficient admin balance')
      }
      
      // 获取当前 gas 价格
      const gasPrice = await this.provider.getFeeData()
      
      // 发送交易
      console.log(`Transferring ${amount} DEDATA to ${toAddress} for: ${reason}`)
      const tx = await this.tokenContract.transfer(toAddress, amountWei, {
        gasLimit: config.gasLimit,
        gasPrice: gasPrice.gasPrice,
      })
      
      // 返回待确认状态
      return {
        txHash: tx.hash,
        status: 'PENDING',
        amount: amount.toString(),
      }
    } catch (error) {
      console.error('Token transfer failed:', error)
      return {
        txHash: '',
        status: 'FAILED',
        amount: amount.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 等待交易确认
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 2
  ): Promise<{
    status: 'SUCCESS' | 'FAILED'
    blockNumber?: number
    gasUsed?: string
    error?: string
  }> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations)
      
      if (!receipt) {
        throw new Error('Transaction receipt not found')
      }
      
      // 检查交易是否成功
      if (receipt.status === 0) {
        throw new Error('Transaction reverted')
      }
      
      return {
        status: 'SUCCESS',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      }
    } catch (error) {
      console.error('Transaction confirmation failed:', error)
      return {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 获取交易状态
   */
  async getTransactionStatus(txHash: string): Promise<{
    status: 'PENDING' | 'SUCCESS' | 'FAILED'
    confirmations?: number
    blockNumber?: number
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash)
      
      if (!receipt) {
        // 交易还在 pending
        return { status: 'PENDING' }
      }
      
      // 获取当前区块号
      const currentBlock = await this.provider.getBlockNumber()
      const confirmations = currentBlock - receipt.blockNumber + 1
      
      return {
        status: receipt.status === 1 ? 'SUCCESS' : 'FAILED',
        confirmations,
        blockNumber: receipt.blockNumber,
      }
    } catch (error) {
      console.error('Failed to get transaction status:', error)
      return { status: 'PENDING' }
    }
  }

  /**
   * 批量转账（用于批量发放）
   */
  async batchTransfer(
    transfers: Array<{ address: string; amount: number; reason: string }>
  ): Promise<Array<{ address: string; txHash: string; status: string }>> {
    const results = []
    
    for (const transfer of transfers) {
      const result = await this.transferTokens(
        transfer.address,
        transfer.amount,
        transfer.reason
      )
      
      results.push({
        address: transfer.address,
        txHash: result.txHash,
        status: result.status,
      })
      
      // 避免 nonce 冲突，等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return results
  }
}

// 懒加载单例模式，避免在构建时就实例化
let tokenTransferServiceInstance: TokenTransferService | null = null

export function getTokenTransferService(): TokenTransferService {
  if (!tokenTransferServiceInstance) {
    tokenTransferServiceInstance = new TokenTransferService()
  }
  return tokenTransferServiceInstance
}

// 为了兼容现有代码，也导出一个 getter
export const tokenTransferService = {
  get instance() {
    return getTokenTransferService()
  },
  transferTokens(...args: Parameters<TokenTransferService['transferTokens']>) {
    return getTokenTransferService().transferTokens(...args)
  },
  waitForTransaction(...args: Parameters<TokenTransferService['waitForTransaction']>) {
    return getTokenTransferService().waitForTransaction(...args)
  },
  getTransactionStatus(...args: Parameters<TokenTransferService['getTransactionStatus']>) {
    return getTokenTransferService().getTransactionStatus(...args)
  },
  batchTransfer(...args: Parameters<TokenTransferService['batchTransfer']>) {
    return getTokenTransferService().batchTransfer(...args)
  },
}