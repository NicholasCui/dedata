import 'dotenv/config'
import { redis } from '@/infrastructure/redis/client'
import { prisma } from '@/lib/prisma'
import { payoutLogger, blockchainLogger } from '@/lib/logger'
import { ethers } from 'ethers'

const PAYOUT_QUEUE = 'payout:queue'
const PROCESSING_SET = 'payout:processing'

interface PayoutJob {
  payoutId: string
  userId: string
  did: string
  amount: string
  timestamp: number
}

async function processPayouts() {
  payoutLogger.info('🚀 Starting payout processing worker...')
  payoutLogger.info('📊 Initializing with configuration:', {
    queue: PAYOUT_QUEUE,
    processingSet: PROCESSING_SET,
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
    tokenContract: process.env.NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS
  })
  
  // Recovery: Process any pending payouts from database on startup
  await recoverPendingPayouts()
  
  while (true) {
    try {
      // Move job from queue to processing set
      const jobData = await redis.lmove(
        PAYOUT_QUEUE,
        PROCESSING_SET,
        'LEFT',
        'RIGHT'
      )
      
      if (!jobData) {
        // No jobs in queue, wait 5 seconds
        payoutLogger.debug('⏳ No jobs in queue, waiting 5 seconds...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        continue
      }
      
      let job: PayoutJob
      try {
        job = JSON.parse(jobData)
      } catch (error) {
        payoutLogger.error('❌ Failed to parse job data:', {
          jobData,
          jobDataType: typeof jobData,
          error: error instanceof Error ? error.message : String(error)
        })
        // Remove invalid job from processing set
        await redis.lrem(PROCESSING_SET, 0, jobData)
        continue
      }
      payoutLogger.info('🔄 Processing payout job:', {
        payoutId: job.payoutId,
        userId: job.userId,
        did: job.did,
        amount: job.amount,
        timestamp: new Date(job.timestamp).toISOString()
      })
      
      // First check if payout exists
      const existingPayout = await prisma.tokenPayout.findUnique({
        where: { id: job.payoutId },
        include: {
          user: true,
          checkIn: true // Include related check-in
        }
      })
      
      if (!existingPayout) {
        payoutLogger.error('❌ Payout not found in database, removing from queue', {
          payoutId: job.payoutId
        })
        await redis.lrem(PROCESSING_SET, 0, jobData)
        continue
      }
      
      // Check if already processed
      if (existingPayout.status === 'SUCCESS') {
        payoutLogger.info('✅ Payout already processed successfully, skipping...', {
          payoutId: job.payoutId
        })
        await redis.lrem(PROCESSING_SET, 0, jobData)
        continue
      }
      
      // Update status to processing
      payoutLogger.info('🔄 Updating payout status to PROCESSING...', {
        payoutId: job.payoutId
      })
      await prisma.tokenPayout.update({
        where: { id: job.payoutId },
        data: { 
          status: 'PROCESSING'
        }
      })
      payoutLogger.info('✅ Status updated, starting blockchain transaction...', {
        payoutId: job.payoutId
      })
      
      try {
        // Simulate blockchain transaction
        const txHash = await sendTokens(job.userId, job.amount)
        
        // Update payout success and related check-in in transaction
        await prisma.$transaction(async (tx) => {
          // Update payout
          await tx.tokenPayout.update({
            where: { id: job.payoutId },
            data: { 
              status: 'SUCCESS',
              txHash,
              processedAt: new Date(),
              errorReason: null // Clear any previous error
            }
          })
          
          // Update related check-in if exists
          if (existingPayout.checkIn) {
            await tx.checkIn.update({
              where: { id: existingPayout.checkIn.id },
              data: { status: 'SUCCESS' }
            })
          }
          
          // Create activity log for payout
          await tx.activityLog.create({
            data: {
              userId: job.userId,
              type: 'PAYOUT',
              action: 'Token reward processed successfully',
              metadata: {
                payoutId: job.payoutId,
                checkInId: existingPayout.checkIn?.id,
                txHash,
                amount: job.amount
              }
            }
          })
          
          // Don't create separate CHECK_IN log here - the PAYOUT log contains transaction info
          // The original CHECK_IN log shows the check-in creation
          // This PAYOUT log shows the reward processing with transaction details
        })
        
        payoutLogger.info('🎉 Payout completed successfully!', {
          payoutId: job.payoutId,
          txHash,
          amount: job.amount,
          recipient: existingPayout.user?.walletAddress,
          processedAt: new Date().toISOString()
        })
        
        // Remove from processing set
        await redis.lrem(PROCESSING_SET, 0, jobData)
        
      } catch (error) {
        payoutLogger.error('💥 Payout failed with error:', {
          payoutId: job.payoutId,
          userId: job.userId,
          amount: job.amount,
          errorType: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
        
        // Update payout failure and related check-in
        await prisma.$transaction(async (tx) => {
          // Update payout
          await tx.tokenPayout.update({
            where: { id: job.payoutId },
            data: { 
              status: 'FAILED',
              errorReason: error instanceof Error ? error.message : 'Unknown error',
              processedAt: new Date()
            }
          })
          
          // Update related check-in if exists
          if (existingPayout.checkIn) {
            await tx.checkIn.update({
              where: { id: existingPayout.checkIn.id },
              data: { status: 'FAILED' }
            })
          }
          
          // Create activity log for payout failure
          await tx.activityLog.create({
            data: {
              userId: job.userId,
              type: 'PAYOUT',
              action: 'Token reward processing failed',
              metadata: {
                payoutId: job.payoutId,
                checkInId: existingPayout.checkIn?.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                amount: job.amount
              }
            }
          })
          
          // Don't create separate CHECK_IN failure log - the PAYOUT failure log contains all info
          // The original CHECK_IN log shows the check-in creation
          // This PAYOUT failure log shows what went wrong with the reward processing
        })
        
        // Remove from processing set
        await redis.lrem(PROCESSING_SET, 0, jobData)
      }
      
    } catch (error) {
      payoutLogger.error('💥 Critical worker error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      payoutLogger.info('🔄 Waiting 5 seconds before retry...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
}

async function sendTokens(userId: string, amount: string): Promise<string> {
  blockchainLogger.info('💸 Initiating token transfer...', {
    userId,
    amount
  })
  
  // Get user wallet address
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user) {
    const error = 'User not found in database'
    blockchainLogger.error('❌ User validation failed', {
      userId,
      reason: error
    })
    throw new Error(error)
  }
  
  if (!user.walletAddress) {
    const error = 'User wallet address not found'
    blockchainLogger.error('❌ Wallet validation failed', {
      userId,
      did: user.did,
      reason: error
    })
    throw new Error(error)
  }
  
  blockchainLogger.info('✅ User validation passed', {
    walletAddress: user.walletAddress,
    did: user.did
  })
  
  // Initialize provider and wallet with retry logic
  blockchainLogger.info('🔗 Connecting to Polygon network...', {
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
    tokenContract: process.env.NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS
  })

  let provider: ethers.providers.JsonRpcProvider | undefined
  let wallet: ethers.Wallet | undefined
  let retryCount = 0
  const maxRetries = 3

  // Retry connection with exponential backoff
  while (retryCount < maxRetries) {
    try {
      // Create provider - ethers v5 handles connection pooling internally
      provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_POLYGON_RPC_URL)

      // Test connection with a timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 30000)
      )
      const blockNumberPromise = provider.getBlockNumber()

      await Promise.race([blockNumberPromise, timeoutPromise])

      wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider)
      blockchainLogger.info('✅ Network connection established', {
        senderWallet: wallet.address,
        attempt: retryCount + 1
      })
      break
    } catch (error) {
      retryCount++
      blockchainLogger.warn(`⚠️ RPC connection failed (attempt ${retryCount}/${maxRetries})`, {
        error: error instanceof Error ? error.message : String(error)
      })
      
      if (retryCount >= maxRetries) {
        blockchainLogger.error('❌ Failed to connect to RPC after max retries')
        throw new Error('RPC connection failed: ' + (error instanceof Error ? error.message : String(error)))
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000)
      blockchainLogger.info(`⏳ Waiting ${waitTime}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  // Ensure we have valid provider and wallet
  if (!provider || !wallet) {
    throw new Error('Failed to initialize provider and wallet')
  }
  
  // Token contract ABI (minimal ERC20 transfer function)
  const tokenAbi = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)'
  ]
  
  // Initialize token contract
  console.log('Token Address:', process.env.NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS);
  console.log('Wallet Address:', wallet.address);
  const tokenContract = new ethers.Contract(
    process.env.NEXT_PUBLIC_DEDATA_TOKEN_ADDRESS!,
    tokenAbi,
    wallet
  )
  
  try {
    blockchainLogger.info('🔍 Preparing token transfer...', {
      targetAddress: user.walletAddress,
      transferAmount: amount
    })
    
    // Check wallet balance first
    blockchainLogger.debug('📋 Checking sender balance...')
    const balance = await tokenContract.balanceOf(wallet.address)
    blockchainLogger.info('✅ Sender balance retrieved', {
      balance: balance.toString(),
      required: amount
    })
    
    if (balance < BigInt(amount)) {
      const error = `Insufficient token balance. Required: ${amount}, Available: ${balance.toString()}`
      blockchainLogger.error('❌ Insufficient balance', {
        required: amount,
        available: balance.toString()
      })
      throw new Error(error)
    }
    
    blockchainLogger.info('✅ Balance check passed')

    // Get current gas price from network
    blockchainLogger.debug('🔍 Fetching current gas price...')
    const feeData = await provider.getFeeData()

    // For Polygon, set a minimum gas price of 30 Gwei to ensure transaction goes through
    const minGasPrice = ethers.utils.parseUnits('30', 'gwei')
    const maxFeePerGas = feeData.maxFeePerGas && feeData.maxFeePerGas.gt(minGasPrice)
      ? feeData.maxFeePerGas
      : minGasPrice
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gt(minGasPrice)
      ? feeData.maxPriorityFeePerGas
      : minGasPrice

    blockchainLogger.info('⛽ Gas price configuration', {
      maxFeePerGas: ethers.utils.formatUnits(maxFeePerGas, 'gwei') + ' Gwei',
      maxPriorityFeePerGas: ethers.utils.formatUnits(maxPriorityFeePerGas, 'gwei') + ' Gwei'
    })

    // Send the actual transaction with explicit gas settings
    blockchainLogger.info('💫 Broadcasting transaction to network...')
    const tx = await tokenContract.transfer(user.walletAddress, amount, {
      maxFeePerGas,
      maxPriorityFeePerGas
    })
    
    blockchainLogger.info('✅ Transaction broadcasted successfully!', {
      txHash: tx.hash,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce
    })
    
    blockchainLogger.info('⏳ Waiting for confirmation (1 block)...')
    
    // Wait for transaction confirmation (1 block confirmation)
    const receipt = await tx.wait(1)
    
    if (receipt.status === 0) {
      const error = `Transaction failed on-chain: ${tx.hash}`
      blockchainLogger.error('❌ Transaction failed on-chain', {
        txHash: tx.hash,
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString()
      })
      throw new Error(error)
    }
    
    blockchainLogger.info('🎉 Transaction confirmed successfully!', {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      effectiveGasPrice: receipt.gasPrice?.toString(),
      recipient: user.walletAddress,
      amount
    })
    
    return tx.hash
  } catch (error) {
    blockchainLogger.error('💥 Token transfer failed', {
      targetAddress: user.walletAddress,
      transferAmount: amount,
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

async function recoverPendingPayouts() {
  try {
    payoutLogger.info('🔄 Checking for pending payouts to recover...')
    
    // Find all pending payouts from the last 24 hours
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    
    const pendingPayouts = await prisma.tokenPayout.findMany({
      where: {
        status: {
          in: ['QUEUED', 'PROCESSING'] // Use correct PayoutStatus enum values
        },
        createdAt: {
          gte: yesterday // Only recover recent ones
        }
      },
      include: {
        user: true,
        checkIn: true
      },
      orderBy: {
        createdAt: 'asc' // Process oldest first
      }
    })
    
    if (pendingPayouts.length > 0) {
      payoutLogger.info('📦 Found pending payouts to recover', {
        count: pendingPayouts.length
      })
      
      for (const payout of pendingPayouts) {
        if (!payout.user?.did) {
          payoutLogger.warn('⚠️  Skipping payout - missing user DID', {
            payoutId: payout.id
          })
          continue
        }
        
        const job: PayoutJob = {
          payoutId: payout.id,
          userId: payout.userId,
          did: payout.user.did,
          amount: payout.amount,
          timestamp: Date.now()
        }
        
        // Reset status to QUEUED
        await prisma.tokenPayout.update({
          where: { id: payout.id },
          data: { 
            status: 'QUEUED',
            errorReason: null // Clear any previous errors
          }
        })
        
        // Add to processing queue
        await redis.lpush(PAYOUT_QUEUE, JSON.stringify(job))
        payoutLogger.info('✅ Recovered payout', {
          payoutId: payout.id,
          userDid: payout.user.did
        })
      }
      
      payoutLogger.info('🎯 Successfully recovered pending payouts', {
        recoveredCount: pendingPayouts.length
      })
    } else {
      payoutLogger.info('✨ No pending payouts found to recover')
    }
    
    // Also clean up any expired check-ins (older than 24 hours and still pending)
    await cleanupExpiredCheckIns()
    
  } catch (error) {
    payoutLogger.error('💥 Failed to recover pending payouts', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

async function cleanupExpiredCheckIns() {
  try {
    const expiredTime = new Date()
    expiredTime.setHours(expiredTime.getHours() - 24)
    
    const expiredCheckIns = await prisma.checkIn.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: expiredTime
        }
      },
      include: {
        payout: true
      }
    })
    
    if (expiredCheckIns.length > 0) {
      payoutLogger.info('🧹 Cleaning up expired check-ins', {
        count: expiredCheckIns.length
      })
      
      await prisma.$transaction(async (tx) => {
        for (const checkIn of expiredCheckIns) {
          // Update check-in status
          await tx.checkIn.update({
            where: { id: checkIn.id },
            data: { status: 'FAILED' }
          })
          
          // Update payout status if exists
          if (checkIn.payout) {
            await tx.tokenPayout.update({
              where: { id: checkIn.payout.id },
              data: {
                status: 'FAILED',
                errorReason: 'Check-in expired - timeout after 24 hours',
                processedAt: new Date()
              }
            })
          }
          
          // Create activity log
          await tx.activityLog.create({
            data: {
              userId: checkIn.userId,
              type: 'CHECK_IN',
              action: 'Check-in expired and marked as failed',
              metadata: {
                checkInId: checkIn.id,
                payoutId: checkIn.payout?.id,
                reason: 'Timeout after 24 hours during worker startup cleanup'
              }
            }
          })
        }
      })
      
      payoutLogger.info('✅ Cleaned up expired check-ins', {
        cleanedCount: expiredCheckIns.length
      })
    }
  } catch (error) {
    payoutLogger.error('💥 Failed to cleanup expired check-ins', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

// Note: Worker directly updates database instead of making HTTP calls
// This is more efficient and reduces potential failure points

// Graceful shutdown handling
let isShuttingDown = false

async function shutdown() {
  if (isShuttingDown) return
  isShuttingDown = true
  
  payoutLogger.info('🛑 Shutting down payout worker...')
  
  try {
    // Give ongoing transactions 10 seconds to complete
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // Close database connection
    await prisma.$disconnect()
    payoutLogger.info('✅ Database connection closed')
    
    // Close Redis connection
    await redis.quit()
    payoutLogger.info('✅ Redis connection closed')
    
    payoutLogger.info('👋 Payout worker shutdown complete')
    process.exit(0)
  } catch (error) {
    payoutLogger.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle termination signals
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  payoutLogger.error('💥 Uncaught exception:', {
    error: error.message,
    stack: error.stack
  })
  shutdown()
})

process.on('unhandledRejection', (reason, promise) => {
  payoutLogger.error('💥 Unhandled rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  })
  shutdown()
})

// Start worker with retry logic
async function startWorker() {
  let retryCount = 0
  const maxRetries = 5
  
  while (retryCount < maxRetries && !isShuttingDown) {
    try {
      payoutLogger.info(`🚀 Starting payout worker (attempt ${retryCount + 1}/${maxRetries})...`)
      await processPayouts()
    } catch (error) {
      retryCount++
      payoutLogger.error(`💥 Worker crashed (attempt ${retryCount}/${maxRetries})`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      if (retryCount >= maxRetries) {
        payoutLogger.error('❌ Max retries reached, shutting down')
        await shutdown()
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(5000 * Math.pow(2, retryCount), 60000)
      payoutLogger.info(`⏳ Waiting ${waitTime}ms before restart...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

// Start the worker
startWorker().catch((error) => {
  payoutLogger.error('💥 Failed to start payout worker', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  })
  process.exit(1)
})