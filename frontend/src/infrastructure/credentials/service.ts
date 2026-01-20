import { ethers } from 'ethers'
import { v4 as uuidv4 } from 'uuid'
import canonicalize from 'canonicalize'
import bs58 from 'bs58'

interface VerifiableCredential {
  '@context': string[]
  id: string
  type: string[]
  issuer: string
  issuanceDate: string
  credentialSubject: Record<string, any>
  proof?: Record<string, any>
}

export class CredentialService {
  private issuerDid: string
  private wallet: ethers.Wallet | null

  constructor() {
    // Use the platform's private key for signing
    const privateKey = process.env.ADMIN_PRIVATE_KEY || ''
    
    if (privateKey) {
      try {
        this.wallet = new ethers.Wallet(privateKey)
        const chainId = process.env.DID_PKH_CHAIN_ID || '137' // Default to Polygon
        this.issuerDid = `did:pkh:eip155:${chainId}:${this.wallet.address.toLowerCase()}`
      } catch (error) {
        console.error('Failed to initialize wallet:', error)
        this.wallet = null
        this.issuerDid = 'did:pkh:eip155:137:0x0000000000000000000000000000000000000000'
      }
    } else {
      this.wallet = null
      this.issuerDid = 'did:pkh:eip155:137:0x0000000000000000000000000000000000000000'
    }
  }

  async issueProfileVC(userId: string, profile: any, did: string): Promise<VerifiableCredential> {
    const vcId = `urn:uuid:${uuidv4()}`
    const issuanceDate = new Date().toISOString()

    const vc: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/suites/secp256k1-2019/v1'
      ],
      id: vcId,
      type: ['VerifiableCredential', 'ProfileCredential'],
      issuer: this.issuerDid,
      issuanceDate,
      credentialSubject: {
        id: did,
        profile: {
          name: profile.displayName,
          email: profile.email,
          wallet: profile.wallet
        },
        tokenSummary: profile.tokenSummary
      }
    }

    vc.proof = await this.generateProof(vc)
    return vc
  }

  private async generateProof(vc: VerifiableCredential): Promise<Record<string, any>> {
    if (!this.wallet) {
      // Return a mock proof if no wallet is configured (development mode)
      console.warn('No private key configured, using mock proof')
      return {
        type: 'EcdsaSecp256k1Signature2019',
        created: new Date().toISOString(),
        verificationMethod: `${this.issuerDid}#controller`,
        proofPurpose: 'assertionMethod',
        proofValue: 'mock_signature_development_only'
      }
    }

    // Create proof options
    const created = new Date().toISOString()
    const verificationMethod = `${this.issuerDid}#controller`
    
    // Create a copy of the VC without the proof field
    const vcCopy = { ...vc }
    delete vcCopy.proof
    
    // Create the proof object (will be added to document for signing)
    const proofOptions = {
      '@context': 'https://w3id.org/security/suites/secp256k1-2019/v1',
      type: 'EcdsaSecp256k1Signature2019',
      created,
      verificationMethod,
      proofPurpose: 'assertionMethod'
    }
    
    // Combine VC and proof options for signing
    const documentWithProof = {
      ...vcCopy,
      proof: proofOptions
    }
    
    // Canonicalize the document for signing
    const canonicalDoc = canonicalize(documentWithProof)
    if (!canonicalDoc) {
      throw new Error('Failed to canonicalize document')
    }
    
    // Hash the canonical document using keccak256
    const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(canonicalDoc))

    // Sign the hash
    const signingKey = new ethers.utils.SigningKey(this.wallet.privateKey)
    const signature = signingKey.signDigest(messageHash)
    
    // Combine r, s and recovery values into a single buffer
    // Format: r (32 bytes) + s (32 bytes) + recovery (1 byte)
    const r = signature.r.substring(2) // remove 0x
    const s = signature.s.substring(2) // remove 0x
    const v = signature.v - 27 // convert to recovery id (0 or 1)
    
    // Create a buffer with the signature
    const signatureBytes = Buffer.concat([
      Buffer.from(r, 'hex'),
      Buffer.from(s, 'hex'),
      Buffer.from([v])
    ])
    
    // Encode as base58btc with multibase prefix 'z'
    const proofValue = 'z' + bs58.encode(signatureBytes)
    
    return {
      type: 'EcdsaSecp256k1Signature2019',
      created,
      verificationMethod,
      proofPurpose: 'assertionMethod',
      proofValue
    }
  }
}
