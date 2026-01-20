import { v4 as uuidv4 } from 'uuid'
import { AuthService } from '@/application/ports/services'
import { redis } from '../redis/client'
import { ethers } from 'ethers'

export class SiweAuthService implements AuthService {
  private readonly NONCE_TTL = 10 * 60 // 10 minutes in seconds

  async generateNonce(address: string): Promise<{ nonce: string; message: string }> {
    try {
      const nonce = uuidv4()
      
      // Store nonce in Redis with TTL
      await redis.setex(`nonce:${nonce}`, this.NONCE_TTL, address)

      // Prepare simple message string for SIWE
      const domain = 'localhost'
      const uri = 'http://localhost:3000'
      const version = '1'
      const chainId = 137
      const issuedAt = new Date().toISOString()
      
      // Format message manually to avoid SIWE parsing issues
      const messageText = `${domain} wants you to sign in with your Polygon account:
${address}

Sign in to DeData DID Community Platform

URI: ${uri}
Version: ${version}
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`

      return {
        nonce,
        message: messageText
      }
    } catch (error) {
      console.error('Error creating SIWE message:', error)
      throw error
    }
  }

  async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
    try {
      // Extract nonce from message using regex
      const nonceMatch = message.match(/Nonce: ([a-f0-9-]+)/i)
      if (!nonceMatch) {
        console.error('Nonce not found in message')
        return false
      }
      const nonce = nonceMatch[1]
      
      // Verify nonce exists and matches address
      const storedAddress = await redis.get(`nonce:${nonce}`)
      if (!storedAddress || storedAddress.toLowerCase() !== address.toLowerCase()) {
        console.error('Nonce verification failed', { storedAddress, address })
        return false
      }

      // For manual verification, we can use ethers to verify the signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature)
      
      if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
        // Delete used nonce
        await redis.del(`nonce:${nonce}`)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Signature verification failed:', error)
      return false
    }
  }

  createDid(address: string, chainId: number): string {
    // Create did:pkh identifier
    return `did:pkh:eip155:${chainId}:${address.toLowerCase()}`
  }
}